"""Compare real library implementations on the unchanged synthetic dataset/split."""
import csv
import hashlib
import json
import platform
import time
from pathlib import Path

import catboost
import numpy as np
import sklearn
import xgboost
from catboost import CatBoostClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, average_precision_score, balanced_accuracy_score,
    brier_score_loss, confusion_matrix, f1_score, precision_score, recall_score,
)
from sklearn.model_selection import KFold
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "research" / "matara-synthetic"
OUT = DATA / "model-comparison"
SEED = 42
THRESHOLD = 0.5
PARAMETERS = {
    "Logistic Regression": {"iterations": 2000, "learning_rate": 0.08, "l2": 0.1},
    "Random Forest": {
        "n_estimators": 300, "max_depth": 4, "min_samples_leaf": 3,
        "random_state": SEED, "n_jobs": 2,
    },
    "XGBoost": {
        "n_estimators": 200, "max_depth": 2, "learning_rate": 0.03,
        "min_child_weight": 3, "reg_lambda": 5, "subsample": 0.8,
        "colsample_bytree": 0.8, "objective": "binary:logistic",
        "eval_metric": "logloss", "random_state": SEED, "n_jobs": 2,
    },
    "CatBoost": {
        "iterations": 200, "depth": 3, "learning_rate": 0.03, "l2_leaf_reg": 5,
        "loss_function": "Logloss", "random_seed": SEED, "thread_count": 2,
        "verbose": False, "allow_writing_files": False,
    },
}


def read_csv(name):
    with (DATA / name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


class OriginalLogistic:
    """Exact algorithm/regularization of the earlier JS baseline, vectorized."""
    def fit(self, x, y):
        self.mean = x.mean(axis=0)
        self.scale = x.std(axis=0)
        self.scale[self.scale == 0] = 1
        z = np.column_stack([np.ones(len(x)), (x - self.mean) / self.scale])
        self.weights = np.zeros(z.shape[1])
        for _ in range(2000):
            prob = 1 / (1 + np.exp(-np.clip(z @ self.weights, -35, 35)))
            penalty = 0.1 * self.weights
            penalty[0] = 0
            self.weights -= 0.08 * (z.T @ (prob - y) / len(x) + penalty)
        return self

    def predict_proba(self, x):
        z = self.weights[0] + ((x - self.mean) / self.scale) @ self.weights[1:]
        p = 1 / (1 + np.exp(-np.clip(z, -35, 35)))
        return np.column_stack([1 - p, p])


def make_model(name):
    if name == "Logistic Regression":
        return OriginalLogistic()
    cls = {"Random Forest": RandomForestClassifier, "XGBoost": XGBClassifier,
           "CatBoost": CatBoostClassifier}[name]
    return cls(**PARAMETERS[name])


def score(y, probability):
    prediction = (probability >= THRESHOLD).astype(int)
    per_disease = []
    for j in range(y.shape[1]):
        actual, pred, prob = y[:, j], prediction[:, j], probability[:, j]
        tn, fp, fn, tp = confusion_matrix(actual, pred, labels=[0, 1]).ravel()
        per_disease.append({
            "accuracy": float(accuracy_score(actual, pred)),
            "balanced_accuracy": float(balanced_accuracy_score(actual, pred)),
            "precision": float(precision_score(actual, pred, zero_division=0)),
            "recall": float(recall_score(actual, pred, zero_division=0)),
            "f1": float(f1_score(actual, pred, zero_division=0)),
            "average_precision": float(average_precision_score(actual, prob)),
            "brier": float(brier_score_loss(actual, prob)),
            "positives": int(actual.sum()), "tn": int(tn), "fp": int(fp),
            "fn": int(fn), "tp": int(tp),
        })
    return {
        "label_accuracy": float((prediction == y).mean()),
        "exact_match_accuracy": float(np.all(prediction == y, axis=1).mean()),
        **{f"macro_{key}": float(np.mean([row[key] for row in per_disease]))
           for key in ["balanced_accuracy", "precision", "recall", "f1", "average_precision", "brier"]},
        "per_disease": per_disease,
    }


def main():
    rows = {row["patient_id"]: row for row in read_csv("dataset_100_users.csv")}
    split = read_csv("split.csv")
    train_ids = [r["patient_id"] for r in split if r["split"] == "train"]
    test_ids = [r["patient_id"] for r in split if r["split"] == "test"]
    assert len(rows) == 100 and len(train_ids) == 70 and len(test_ids) == 30
    assert set(train_ids).isdisjoint(test_ids)
    assert set(train_ids + test_ids) == set(rows)
    stored = json.loads((DATA / "models.json").read_text())["models"]
    diseases = list(stored)
    columns = {d: stored[d]["feature_columns"] for d in diseases}
    assert len(diseases) == 6
    assert all(not c.startswith("outcome_") and c != "patient_id"
               for cols in columns.values() for c in cols)
    y_train = np.array([[int(rows[i][f"outcome_{d}"]) for d in diseases] for i in train_ids])
    y_test = np.array([[int(rows[i][f"outcome_{d}"]) for d in diseases] for i in test_ids])
    x_train = {d: np.array([[float(rows[i][c]) for c in columns[d]] for i in train_ids]) for d in diseases}
    x_test = {d: np.array([[float(rows[i][c]) for c in columns[d]] for i in test_ids]) for d in diseases}
    assert all(np.isfinite(x).all() for x in [*x_train.values(), *x_test.values()])
    folds = list(KFold(n_splits=3, shuffle=True, random_state=SEED).split(train_ids))
    results, predictions, oof_predictions = {}, {}, {}
    for name in [*PARAMETERS, "Majority baseline"]:
        started = time.perf_counter()
        p = np.zeros(y_test.shape)
        oof = np.zeros(y_train.shape)
        for j, disease in enumerate(diseases):
            for fit_idx, valid_idx in folds:
                assert set(fit_idx).isdisjoint(valid_idx)
                assert len(np.unique(y_train[fit_idx, j])) == 2
                if name == "Majority baseline":
                    oof[valid_idx, j] = y_train[fit_idx, j].mean()
                else:
                    model = make_model(name).fit(x_train[disease][fit_idx], y_train[fit_idx, j])
                    oof[valid_idx, j] = model.predict_proba(x_train[disease][valid_idx])[:, 1]
            if name == "Majority baseline":
                p[:, j] = y_train[:, j].mean()
            else:
                model = make_model(name).fit(x_train[disease], y_train[:, j])
                p[:, j] = model.predict_proba(x_test[disease])[:, 1]
            if name == "Logistic Regression":
                ref = stored[disease]
                z = np.array(ref["weights"])[0] + ((x_test[disease] - ref["means"]) / ref["scales"]) @ np.array(ref["weights"])[1:]
                np.testing.assert_allclose(p[:, j], 1 / (1 + np.exp(-np.clip(z, -35, 35))), atol=1e-8, rtol=0)
        assert np.isfinite(p).all() and ((p >= 0) & (p <= 1)).all()
        predictions[name], oof_predictions[name] = p, oof
        results[name] = {
            "test": score(y_test, p),
            "train_only_3fold_oof": score(y_train, oof),
            "elapsed_seconds": time.perf_counter() - started,
        }
        print(name, json.dumps({k: v for k, v in results[name]["test"].items() if k != "per_disease"}), flush=True)
    # Use users as resampling units; six labels from one user stay together.
    # This still assumes independent users, which shared contacts violate.
    bootstrap = np.random.default_rng(SEED).integers(0, 30, size=(2000, 30))
    baseline_correct = (predictions["Majority baseline"] >= THRESHOLD) == y_test
    for name, p in predictions.items():
        correct = (p >= THRESHOLD) == y_test
        delta = correct[bootstrap].mean(axis=(1, 2)) - baseline_correct[bootstrap].mean(axis=(1, 2))
        results[name]["illustrative_paired_user_bootstrap_accuracy_delta_vs_baseline_95pct"] = np.quantile(delta, [0.025, 0.975]).tolist()
    cv_choice = max(PARAMETERS, key=lambda n: results[n]["train_only_3fold_oof"]["macro_f1"])
    test_accuracy_winners = [n for n in PARAMETERS if results[n]["test"]["label_accuracy"] == max(results[m]["test"]["label_accuracy"] for m in PARAMETERS)]
    metadata = {
        "use": "synthetic_comparison_only_not_clinical",
        "versions": {"python": platform.python_version(), "numpy": np.__version__,
                     "scikit_learn": sklearn.__version__, "catboost": catboost.__version__,
                     "xgboost": xgboost.__version__},
        "file_sha256": {name: hashlib.sha256((DATA / name).read_bytes()).hexdigest()
                        for name in ["dataset_100_users.csv", "split.csv", "models.json"]},
        "train_users": train_ids, "test_users": test_ids, "diseases": diseases,
        "feature_columns": columns, "threshold": THRESHOLD, "parameters": PARAMETERS,
        "training_cv": {"folds": 3, "seed": SEED, "purpose": "exploratory selection by macro F1, no hyperparameter search"},
        "test_accuracy_winners": test_accuracy_winners,
        "training_cv_macro_f1_choice": cv_choice,
        "llm": {"tested": False, "reason": "No configured local pretrained model or inference endpoint. No external data upload or LLM score fabricated."},
        "results": results,
    }
    OUT.mkdir(exist_ok=True)
    (OUT / "comparison.json").write_text(json.dumps(metadata, indent=2, allow_nan=False), encoding="utf-8")
    for filename, ids, ys, probs in [
        ("test_predictions.csv", test_ids, y_test, predictions),
        ("training_oof_predictions.csv", train_ids, y_train, oof_predictions),
    ]:
        with (OUT / filename).open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["model", "patient_id", "disease", "actual", "simulation_score", "predicted"])
            for name, matrix in probs.items():
                for i, user in enumerate(ids):
                    for j, disease in enumerate(diseases):
                        writer.writerow([name, user, disease, int(ys[i, j]), float(matrix[i, j]), int(matrix[i, j] >= THRESHOLD)])
    pct = lambda value: f"{100 * value:.1f}%"
    lines = [
        "# Model comparison on the unchanged coordinate dataset", "",
        "**Synthetic results only. Not validated infection probabilities or clinical accuracy.**", "",
        "Same 100 users, 70 train / 30 test, same per-disease feature columns, and threshold 0.5.",
        "Real CatBoost, XGBoost and scikit-learn Random Forest implementations. The Python logistic implementation reproduces the original JavaScript probabilities within 1e-8.",
        "Fixed modest tree depths/regularization; no hyperparameter or threshold tuning. These are configurations, not claims about the best possible version of each algorithm.", "",
        "| Model | Test label accuracy | Balanced accuracy | Macro recall | Macro F1 | Macro AP | Train-only CV macro F1 |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for name, result in results.items():
        m = result["test"]
        lines.append(f"| {name} | {pct(m['label_accuracy'])} | {pct(m['macro_balanced_accuracy'])} | {pct(m['macro_recall'])} | {pct(m['macro_f1'])} | {pct(m['macro_average_precision'])} | {pct(result['train_only_3fold_oof']['macro_f1'])} |")
    lines += ["", f"Highest observed test accuracy: {', '.join(test_accuracy_winners)}.",
              f"Exploratory choice using training-only three-fold out-of-fold macro F1: {cv_choice}.",
              "Model comparison on the previously inspected test set is exploratory; selection needs a new untouched external test set.", "",
              "## Per-disease test results", ""]
    for j, disease in enumerate(diseases):
        lines += [f"### {disease}", "", "| Model | Positive / 30 | Accuracy | Precision | Recall | F1 | TN / FP / FN / TP |", "|---|---:|---:|---:|---:|---:|---|"]
        for name, result in results.items():
            m = result["test"]["per_disease"][j]
            lines.append(f"| {name} | {m['positives']} | {pct(m['accuracy'])} | {pct(m['precision'])} | {pct(m['recall'])} | {pct(m['f1'])} | {m['tn']} / {m['fp']} / {m['fn']} / {m['tp']} |")
        lines.append("")
    lines += [
        "## Interpretation and limitations", "",
        "- Majority accuracy is high because positive outcomes are uncommon. Compare recall, F1 and average precision as well as accuracy.",
        "- AP (average precision) measures probability ranking, not calibration. Brier scores are provided in comparison.json.",
        "- Only 30 test users: a small number of decisions can change the ranking. Shared contacts make users dependent; neither split nor CV is network-disjoint or time-disjoint.",
        "- Paired user-level bootstrap intervals versus baseline in JSON are illustrative; shared-contact dependence means they are not formal evidence of statistical superiority.",
        "- Source reports/encounters predate the cutoff. User IDs, coordinates and future peer labels are not training features.",
        "- Labels were generated by an invented mechanism, not real clinical follow-up. A higher score cannot establish real disease-prediction effectiveness.",
        "- LLM was NOT tested: no local pretrained weights or inference endpoint is configured. The tabular benchmark does not measure text-summary quality.",
        "- All fitting uses CPU with at most two threads. No external data upload. No application integration.", "",
        "## Reproduce", "",
        "Install research/model-comparison-requirements.txt into an isolated Python environment, then run:", "",
        "```sh", "python scripts/compare-matara-models.py", "```", "",
        "Library versions, exact settings, feature order, dataset hashes, predictions and fold-level source predictions are saved alongside this report.",
    ]
    (OUT / "RESULTS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Completed. Report:", OUT / "RESULTS.md", flush=True)


if __name__ == "__main__":
    main()
