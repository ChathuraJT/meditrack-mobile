# Model comparison on the unchanged coordinate dataset

**Synthetic results only. Not validated infection probabilities or clinical accuracy.**

Same 100 users, 70 train / 30 test, same per-disease feature columns, and threshold 0.5.
Real CatBoost, XGBoost and scikit-learn Random Forest implementations. The Python logistic implementation reproduces the original JavaScript probabilities within 1e-8.
Fixed modest tree depths/regularization; no hyperparameter or threshold tuning. These are configurations, not claims about the best possible version of each algorithm.

| Model | Test label accuracy | Balanced accuracy | Macro recall | Macro F1 | Macro AP | Train-only CV macro F1 |
|---|---:|---:|---:|---:|---:|---:|
| Logistic Regression | 79.4% | 58.0% | 20.2% | 23.7% | 40.4% | 18.6% |
| Random Forest | 78.3% | 50.5% | 2.4% | 3.7% | 39.9% | 9.5% |
| XGBoost | 75.6% | 48.0% | 0.0% | 0.0% | 41.9% | 9.7% |
| CatBoost | 76.7% | 52.9% | 11.8% | 18.1% | 37.5% | 17.7% |
| Majority baseline | 78.9% | 50.0% | 0.0% | 0.0% | 21.1% | 0.0% |

Highest observed test accuracy: Logistic Regression.
Exploratory choice using training-only three-fold out-of-fold macro F1: Logistic Regression.
Model comparison on the previously inspected test set is exploratory; selection needs a new untouched external test set.

## Per-disease test results

### influenza

| Model | Positive / 30 | Accuracy | Precision | Recall | F1 | TN / FP / FN / TP |
|---|---:|---:|---:|---:|---:|---|
| Logistic Regression | 6 | 83.3% | 66.7% | 33.3% | 44.4% | 23 / 1 / 4 / 2 |
| Random Forest | 6 | 80.0% | 0.0% | 0.0% | 0.0% | 24 / 0 / 6 / 0 |
| XGBoost | 6 | 80.0% | 0.0% | 0.0% | 0.0% | 24 / 0 / 6 / 0 |
| CatBoost | 6 | 86.7% | 100.0% | 33.3% | 50.0% | 24 / 0 / 4 / 2 |
| Majority baseline | 6 | 80.0% | 0.0% | 0.0% | 0.0% | 24 / 0 / 6 / 0 |

### chickenpox

| Model | Positive / 30 | Accuracy | Precision | Recall | F1 | TN / FP / FN / TP |
|---|---:|---:|---:|---:|---:|---|
| Logistic Regression | 11 | 66.7% | 100.0% | 9.1% | 16.7% | 19 / 0 / 10 / 1 |
| Random Forest | 11 | 63.3% | 0.0% | 0.0% | 0.0% | 19 / 0 / 11 / 0 |
| XGBoost | 11 | 63.3% | 0.0% | 0.0% | 0.0% | 19 / 0 / 11 / 0 |
| CatBoost | 11 | 66.7% | 100.0% | 9.1% | 16.7% | 19 / 0 / 10 / 1 |
| Majority baseline | 11 | 63.3% | 0.0% | 0.0% | 0.0% | 19 / 0 / 11 / 0 |

### measles

| Model | Positive / 30 | Accuracy | Precision | Recall | F1 | TN / FP / FN / TP |
|---|---:|---:|---:|---:|---:|---|
| Logistic Regression | 3 | 90.0% | 0.0% | 0.0% | 0.0% | 27 / 0 / 3 / 0 |
| Random Forest | 3 | 90.0% | 0.0% | 0.0% | 0.0% | 27 / 0 / 3 / 0 |
| XGBoost | 3 | 90.0% | 0.0% | 0.0% | 0.0% | 27 / 0 / 3 / 0 |
| CatBoost | 3 | 90.0% | 0.0% | 0.0% | 0.0% | 27 / 0 / 3 / 0 |
| Majority baseline | 3 | 90.0% | 0.0% | 0.0% | 0.0% | 27 / 0 / 3 / 0 |

### mumps

| Model | Positive / 30 | Accuracy | Precision | Recall | F1 | TN / FP / FN / TP |
|---|---:|---:|---:|---:|---:|---|
| Logistic Regression | 7 | 76.7% | 0.0% | 0.0% | 0.0% | 23 / 0 / 7 / 0 |
| Random Forest | 7 | 76.7% | 0.0% | 0.0% | 0.0% | 23 / 0 / 7 / 0 |
| XGBoost | 7 | 76.7% | 0.0% | 0.0% | 0.0% | 23 / 0 / 7 / 0 |
| CatBoost | 7 | 80.0% | 100.0% | 14.3% | 25.0% | 23 / 0 / 6 / 1 |
| Majority baseline | 7 | 76.7% | 0.0% | 0.0% | 0.0% | 23 / 0 / 7 / 0 |

### viral_conjunctivitis

| Model | Positive / 30 | Accuracy | Precision | Recall | F1 | TN / FP / FN / TP |
|---|---:|---:|---:|---:|---:|---|
| Logistic Regression | 4 | 83.3% | 40.0% | 50.0% | 44.4% | 23 / 3 / 2 / 2 |
| Random Forest | 4 | 83.3% | 0.0% | 0.0% | 0.0% | 25 / 1 / 4 / 0 |
| XGBoost | 4 | 76.7% | 0.0% | 0.0% | 0.0% | 23 / 3 / 4 / 0 |
| CatBoost | 4 | 70.0% | 0.0% | 0.0% | 0.0% | 21 / 5 / 4 / 0 |
| Majority baseline | 4 | 86.7% | 0.0% | 0.0% | 0.0% | 26 / 0 / 4 / 0 |

### viral_gastroenteritis

| Model | Positive / 30 | Accuracy | Precision | Recall | F1 | TN / FP / FN / TP |
|---|---:|---:|---:|---:|---:|---|
| Logistic Regression | 7 | 76.7% | 50.0% | 28.6% | 36.4% | 21 / 2 / 5 / 2 |
| Random Forest | 7 | 76.7% | 50.0% | 14.3% | 22.2% | 22 / 1 / 6 / 1 |
| XGBoost | 7 | 66.7% | 0.0% | 0.0% | 0.0% | 20 / 3 / 7 / 0 |
| CatBoost | 7 | 66.7% | 20.0% | 14.3% | 16.7% | 19 / 4 / 6 / 1 |
| Majority baseline | 7 | 76.7% | 0.0% | 0.0% | 0.0% | 23 / 0 / 7 / 0 |

## Interpretation and limitations

- Majority accuracy is high because positive outcomes are uncommon. Compare recall, F1 and average precision as well as accuracy.
- AP (average precision) measures probability ranking, not calibration. Brier scores are provided in comparison.json.
- Only 30 test users: a small number of decisions can change the ranking. Shared contacts make users dependent; neither split nor CV is network-disjoint or time-disjoint.
- Paired user-level bootstrap intervals versus baseline in JSON are illustrative; shared-contact dependence means they are not formal evidence of statistical superiority.
- Source reports/encounters predate the cutoff. User IDs, coordinates and future peer labels are not training features.
- Labels were generated by an invented mechanism, not real clinical follow-up. A higher score cannot establish real disease-prediction effectiveness.
- LLM was NOT tested: no local pretrained weights or inference endpoint is configured. The tabular benchmark does not measure text-summary quality.
- All fitting uses CPU with at most two threads. No external data upload. No application integration.

## Reproduce

Install research/model-comparison-requirements.txt into an isolated Python environment, then run:

```sh
python scripts/compare-matara-models.py
```

Library versions, exact settings, feature order, dataset hashes, predictions and fold-level source predictions are saved alongside this report.
