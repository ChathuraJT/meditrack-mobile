"""Build a self-contained Sinhala HTML report and chart from saved benchmark results."""
import base64
import csv
import hashlib
import html
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "research" / "matara-synthetic"
OUT = ROOT / "research" / "reports"
REPORT = json.loads((DATA / "model-comparison" / "comparison.json").read_text())
SUMMARY = json.loads((DATA / "proximity-summary.json").read_text())
for filename, expected in REPORT["file_sha256"].items():
    assert hashlib.sha256((DATA / filename).read_bytes()).hexdigest() == expected, f"Stale benchmark: {filename}"
OUT.mkdir(exist_ok=True)
MODELS = ["Logistic Regression", "Random Forest", "XGBoost", "CatBoost", "Majority baseline"]
NAMES = {
    "influenza": "Influenza",
    "chickenpox": "Chickenpox",
    "measles": "Measles",
    "mumps": "Mumps",
    "viral_conjunctivitis": "Viral conjunctivitis",
    "viral_gastroenteritis": "Viral gastroenteritis",
}


def pct(value):
    return f"{100 * value:.1f}%"


def table(headers, rows, cls=""):
    return f'<table class="{cls}"><thead><tr>' + "".join(f"<th>{html.escape(str(v))}</th>" for v in headers) + "</tr></thead><tbody>" + "".join(
        "<tr>" + "".join(f"<td>{html.escape(str(v))}</td>" for v in row) + "</tr>" for row in rows
    ) + "</tbody></table>"


def page(number, title, body, label="පර්යේෂණ ක්‍රියාවලිය සහ ප්‍රතිඵල"):
    return f"""<section class="page" id="page-{number}">
    <div class="eyebrow">MEDITRACK / MATARA RESEARCH PROTOTYPE</div>
    <div class="kicker">{label}</div><h2>{title}</h2>{body}
    <footer><span>කෘත්‍රිම දත්ත පමණි · සායනික භාවිතයට තහවුරු කර නැත</span><span>{number} / 8</span></footer>
    </section>"""


def disease_tables(indices):
    sections = []
    for j in indices:
        disease = REPORT["diseases"][j]
        rows = []
        for name in MODELS:
            m = REPORT["results"][name]["test"]["per_disease"][j]
            rows.append([name, pct(m["accuracy"]), pct(m["precision"]), pct(m["recall"]), pct(m["f1"]),
                         f'{m["tn"]} / {m["fp"]} / {m["fn"]} / {m["tp"]}'])
        positive = REPORT["results"]["Logistic Regression"]["test"]["per_disease"][j]["positives"]
        sections.append(f'<h3>{NAMES[disease]} <span class="muted">— positive {positive} / 30</span></h3>' +
                        table(["Model", "Accuracy", "Precision", "Recall", "F1", "TN / FP / FN / TP"], rows, "compact numeric"))
    return "".join(sections)


fig, axes = plt.subplots(1, 2, figsize=(10, 3.25), dpi=180)
short = ["Logistic", "Random Forest", "XGBoost", "CatBoost", "Baseline"]
bar_colors = ["#137c76", "#547490", "#547490", "#547490", "#a0a9b3"]
for ax, metric, title in [
    (axes[0], "label_accuracy", "Accuracy across 180 decisions"),
    (axes[1], "macro_f1", "Macro F1 across six diseases"),
]:
    values = [REPORT["results"][m]["test"][metric] * 100 for m in MODELS]
    y = np.arange(len(values))
    ax.barh(y, values, color=bar_colors, height=0.62)
    ax.set_yticks(y, short)
    ax.invert_yaxis()
    ax.set_xlim(0, 100)
    ax.set_xlabel("Percent")
    ax.set_title(title, loc="left", fontsize=11, fontweight="bold")
    for i, value in enumerate(values):
        ax.text(value + 1.5, i, f"{value:.1f}", va="center", fontsize=9)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.xaxis.grid(True, alpha=0.15)
    ax.set_axisbelow(True)
fig.tight_layout(pad=1.4)
chart = OUT / "model-comparison-chart.png"
fig.savefig(chart, facecolor="white", bbox_inches="tight")
plt.close(fig)
image_uri = "data:image/png;base64," + base64.b64encode(chart.read_bytes()).decode()

lr = REPORT["results"]["Logistic Regression"]["test"]
baseline = REPORT["results"]["Majority baseline"]["test"]
overall_rows = []
for name in MODELS:
    result = REPORT["results"][name]
    m = result["test"]
    overall_rows.append([name, pct(m["label_accuracy"]), pct(m["macro_balanced_accuracy"]),
                         pct(m["macro_recall"]), pct(m["macro_f1"]),
                         pct(result["train_only_3fold_oof"]["macro_f1"])])
pages = []
pages.append(page(1, "ස්ථාන ආසන්නතාව සහ<br>රෝග නිරාවරණය", f"""
    <p class="lead">පරිශීලකයන් 100 දෙනෙකුගේ කෘත්‍රිම Matara dataset එකක් මත කළ
    coordinate matching සහ machine-learning model comparison වාර්තාව.</p>
    <div class="date">වාර්තා දිනය: 2026 ඔක්තෝබර් 20 · භාෂාව: සිංහල</div>
    <div class="stats"><div><strong>100</strong><span>කෘත්‍රිම පරිශීලකයන්</span></div>
    <div><strong>6</strong><span>රෝග කාණ්ඩ</span></div><div><strong>4</strong><span>පරීක්ෂා කළ models</span></div></div>
    <div class="callout"><b>ප්‍රධාන ප්‍රතිඵලය</b><p>පරීක්ෂා කළ settings යටතේ Logistic Regression එකට
    වැඩිම test accuracy ({pct(lr['label_accuracy'])}) සහ Macro F1 ({pct(lr['macro_f1'])}) ලැබුණා.
    එහෙත් සරල baseline එකේ accuracy එකත් {pct(baseline['label_accuracy'])} නිසා
    මෙය ශක්තිමත් රෝග පුරෝකථන සාක්ෂියක් නොවෙයි.</p></div>
    <h3>අප කළ ක්‍රියාවලිය</h3>
    <ol><li>රෝග හය සහ medical-history fields තෝරාගත්තා.</li>
    <li>පළමු area-level sample එකට latitude/longitude සහ කාල වාර්තා එකතු කළා.</li>
    <li>එකම කාලයේ ආසන්නව සිටි පරිශීලක යුගල සහ කෘත්‍රිම රෝග නිරාවරණ දත්ත සෑදුවා.</li>
    <li>එකම training/test බෙදීම මත models හතරක් පුහුණු කර, baseline එකක් සමඟ සසඳා බැලුවා.</li></ol>
    <p class="note">මෙහි අගයන් අවසාන coordinate-based dataset එකට අදාළයි.
    පැරණි area-only dataset එකේ ප්‍රතිඵල මේ අවසාන ප්‍රතිඵල සමඟ මිශ්‍ර කර නැහැ.</p>
    <p class="warning">සැබෑ රෝගීන්, සැබෑ GPS tracks හෝ සැබෑ outbreak වාර්තා මෙයට භාවිත කර නැහැ.
    Diagnosis, ආසාදන සම්භාවිතාව හෝ prescription සඳහා මේ model එක තහවුරු කර නැහැ.</p>
""", "ක්‍රියාවලිය • දත්ත • පරීක්ෂාව • සීමාවන්"))

pages.append(page(2, "Dataset එකේ අන්තර්ගතය", """
    <p>රෝග: <b>Influenza, Chickenpox, Measles, Mumps, Viral conjunctivitis සහ Viral gastroenteritis.</b>
    ප්‍රදේශ: මාතර නගරය, වැලිගම, අකුරැස්ස, දික්වැල්ල, හක්මන සහ කඹුරුපිටිය.</p>
""" + table(["දත්ත ගොනුව", "වාර්තා", "අන්තර්ගතය"], [
    ["users.csv", 100, "වයස, home area සහ කෘත්‍රිම medical history"],
    ["location_visits.csv", 2800, "Latitude/longitude, accuracy, start/end time"],
    ["location_anchors.csv", 6, "ආසන්න synthetic town anchors"],
    ["proximity_pairs.csv", SUMMARY["pair_rows"], "ආසන්නව එකවර සිටි user pairs"],
    ["ble_encounters.csv", SUMMARY["ble_rows"], "Pairs කිහිපයක කෘත්‍රිම BLE observations"],
    ["source_infection_episodes.csv", SUMMARY["source_episode_rows"], "පෙර දැන සිටි කෘත්‍රිම ආසාදන වාර්තා"],
    ["pair_disease_exposure.csv", SUMMARY["disease_exposure_rows"], "Pair × දිශා දෙක × රෝග හය"],
    ["area_disease_reports.csv", 144, "ප්‍රදේශ × රෝග × සති 4"],
    ["dataset_100_users.csv", 100, "Model features සහ outcome labels හය"],
    ["outcomes.csv", 600, "User × රෝග අනුව simulated outcomes"],
], "small") + """
    <h3>කාල සීමාව සහ labels</h3>
    <p>Prediction cutoff: <b>2026-09-01 00:00, Asia/Colombo.</b>
    ඊට පෙර දින 28ක visits භාවිත කළා. ඊළඟ දින 28 සඳහා outcomes නිර්මාණය කළා;
    follow-up අවසානය 2026-09-29 00:00යි.</p>
    <p>එක් රෝගයකට <b>1 = simulated positive</b> සහ <b>0 = simulated negative</b>.
    එක් user කෙනෙකුට කිසිදු රෝගයක් නැති හෝ රෝග එකක්/කිහිපයක් ඇති labels ලැබිය හැකියි.
    මේවා වෛද්‍ය පරීක්ෂණවලින් ලැබුණු diagnoses නොවෙයි.</p>
    <h3>Medical-history inputs</h3>
    <p>වයස (5–80), immunocompromised status, chronic respiratory history,
    MMR doses (0–2), varicella immunity history සහ recent influenza vaccination
    කෘත්‍රිමව නිර්මාණය කළා. මේ බෙදාහැරීම් ශ්‍රී ලංකාවේ සැබෑ ජනගහනය නියෝජනය නොකරයි.</p>
"""))

pages.append(page(3, "Coordinates දෙකක් සසඳන ආකාරය", """
    <div class="flow">Latitude / Longitude → Haversine distance → Time overlap → Historical source episode → Exposure features</div>
    <ol><li>Users දෙදෙනාගේ latitude/longitude අතර දුර මීටර්වලින් ගණනය කළා.</li>
    <li>එම visits දෙකේ එකවර රැඳී සිටි කාලය ගණනය කළා.</li>
    <li><b>දුර ≤ 50 m සහ overlap ≥ 5 min</b> වූ යුගල තෝරාගත්තා.
    මේවා වෙනස් කළ හැකි search settings; වෛද්‍ය transmission සීමාවන් නොවෙයි.</li>
    <li>එක් එක් රෝගයට A → B සහ B → A දෙදිශාවම සසඳා බැලුවා.</li></ol>
    <h3>Generated dataset එකෙන් උදාහරණයක්: PAIR56</h3>
""" + table(["User", "Latitude", "Longitude", "Simulated GPS accuracy"], [
    ["SYN008", "6.078063", "80.564512", "17 m"],
    ["SYN020", "6.078126", "80.564476", "15 m"],
], "numeric") + """
    <p>Measured distance: <b>8.057199 m</b> · overlap: <b>44 minutes</b>.
    Accuracy radii එකතු කළ විට illustrative distance bounds <b>0–40.057199 m</b>.
    මේ pair එකට BLE observation එකක් නැහැ.</p>
    <p>SYN020 සඳහා එම encounter කාලයට අදාළ, පෙර report කළ කෘත්‍රිම chickenpox
    episode එකක් තිබෙනවා. SYN008 සඳහා ලැබුණු toy exposure index එක
    <b>0.490164</b>යි. එය <b>49% ආසාදන සම්භාවිතාවක් නොවෙයි.</b></p>
    <h3>භාවිත කළ පරීක්ෂණ සූත්‍රය</h3>
    <pre>infectious_overlap_hours × exp(-distance_m / 20)
× context_weight × (1 - 0.6 × simplified_immunity)</pre>
    <p class="small">Context flags: same indoor space, shared-food contact, hand/surface contact.
    මේවා GPS එකෙන් හඳුනාගත්තේ නැහැ; වෙනම simulate කළා.
    රෝග අනුව context weight යෙදුවත් එහි coefficients වෛද්‍යමය වශයෙන් තහවුරු කර නැහැ.</p>
    <p class="warning">Source episode එක encounter එකට පෙර report වී තිබිය යුතුයි.
    පසුව ලැබුණු outcome label එකකින් අතීත ආසාදිත බව තීරණය කළේ නැහැ.
    Unknown status කියන්නේ “ආසාදනයක් නැහැ” කියන තේරුම නොවෙයි.</p>
"""))

pages.append(page(4, "Training සහ evaluation සැකසුම", """
    <div class="stats"><div><strong>70</strong><span>Training users</span></div>
    <div><strong>30</strong><span>Held-out test users</span></div>
    <div><strong>0.5</strong><span>Decision threshold</span></div></div>
    <p>එක් model වර්ගයකට රෝග හය සඳහා binary classifiers හයක් පුහුණු කළා.
    Models සියල්ලටම එකම users, එකම feature definitions සහ එකම threshold භාවිත කළා.
    Test users training එකට ඇතුළත් කළේ නැහැ.</p>
""" + table(["Model", "ස්ථාවර settings"], [
    ["Logistic Regression", "L2 = 0.1; 2,000 gradient steps; learning rate 0.08"],
    ["Random Forest", "300 trees; max depth 4; minimum leaf samples 3"],
    ["XGBoost", "200 trees; depth 2; learning rate 0.03; lambda 5; min child weight 3"],
    ["CatBoost", "200 iterations; depth 3; learning rate 0.03; L2 leaf regularization 5"],
    ["Majority baseline", "රෝගයක් සඳහා training data එකේ වැඩිම label එක predict කිරීම"],
], "small") + """
    <h3>Feature selection සහ data leakage පාලනය</h3>
    <p>History, visit/indoor/BLE hours, nearby-user counts, pair-contact hours,
    area exposure සහ disease-specific contact features භාවිත කළා.
    User IDs, absolute coordinates සහ future outcomes predictors ලෙස භාවිත කළේ නැහැ.
    Logistic Regression scaling fit කළේ training data මත පමණයි.</p>
    <h3>අමතර පරීක්ෂාව</h3>
    <p>Training users 70 තුළ three-fold out-of-fold validation කළා.
    Macro F1 අනුව exploratory model selection කළා. Hyperparameter search,
    class weighting හෝ threshold tuning කළේ නැහැ. මෙය එක් එක් algorithm එකේ
    හැකි උපරිම performance එක පරීක්ෂා කිරීමක් නොවෙයි.</p>
    <p class="note">Original JavaScript Logistic Regression predictions සහ Python
    implementation එකේ predictions අතර වෙනස 10⁻⁸ සීමාව තුළ බව assert කළා.
    Random Forest, XGBoost සහ CatBoost සඳහා සැබෑ library implementations භාවිත කළා.</p>
    <p class="small">Python 3.13.7 · NumPy 2.2.6 · scikit-learn 1.6.1 ·
    XGBoost 3.0.2 · CatBoost 1.2.8. Model seed: 42; split seed: 731.
    LLM එකක් train හෝ evaluate කළේ නැහැ.</p>
"""))

pages.append(page(5, "සමස්ත model comparison ප්‍රතිඵල", table(
    ["Model", "Accuracy", "Balanced acc.", "Macro recall", "Macro F1", "CV F1"],
    overall_rows, "numeric"
) + f"""
    <img class="chart" src="{image_uri}" alt="Model accuracy and Macro F1 comparison">
    <p><b>Logistic Regression</b> එකට මේ test set එකේ වැඩිම accuracy සහ F1 ලැබුණා.
    Training-only CV Macro F1 එකත් <b>18.6%</b> ලෙස models අතර ඉහළම අගයයි.</p>
    <div class="callout"><b>79.4% accuracy එක පමණක් ප්‍රමාණවත් නොවන්නේ ඇයි?</b>
    <p>Test users 30 × රෝග 6 = තීරණ 180යි. Logistic Regression නිවැරදි තීරණ
    <b>143ක්</b> දුන් අතර baseline එක <b>142ක්</b> දුන්නා.
    එනම් වෙනස එක් නිවැරදි තීරණයක් පමණයි. රෝග-positive අවස්ථා හඳුනාගැනීම
    තවම දුර්වලයි.</p></div>
    <p class="small"><b>Accuracy:</b> නිවැරදි තීරණ ප්‍රතිශතය.
    <b>Recall:</b> positive අවස්ථාවලින් හඳුනාගත් ප්‍රතිශතය.
    <b>F1:</b> precision සහ recall එකට සලකන මිනුම.
    <b>Macro:</b> රෝග හයට සමාන බරක් දී ගත් සාමාන්‍යය.
    <b>Balanced accuracy:</b> sensitivity සහ specificity සාමාන්‍යය.</p>
    <p class="small">Logistic Regression හි සියලු රෝග හයේ predictions එකවර නිවැරදි වූ users:
    <b>7 / 30 (23.3%)</b>. මෙය 79.4% label accuracy එකෙන් වෙනස් මිනුමකි.</p>
"""))

pages.append(page(6, "රෝග අනුව ප්‍රතිඵල — 1", """
    <p class="small">සෑම රෝගයකටම test users 30 දෙනාම භාවිත කළා.
    මේ positive counts සැබෑ රෝග ව්‍යාප්තිය නොව කෘත්‍රිම labels වේ.</p>
""" + disease_tables([0, 1, 2]) + """
    <div class="callout"><b>Measles ප්‍රතිඵලයේ පාඩම</b><p>Accuracy 90% වුවත්
    models සියල්ලම positive අවස්ථා තුනම මගහැරියා. ඒ නිසා accuracy ඉහළ යාම
    පමණක් රෝග හඳුනාගැනීමේ හැකියාව තහවුරු කරන්නේ නැහැ.</p></div>
    <p class="small">TN: නිවැරදි negative · FP: වැරදි positive ·
    FN: මගහැරුණු positive · TP: නිවැරදි positive.</p>
"""))
pages.append(page(7, "රෝග අනුව ප්‍රතිඵල — 2", disease_tables([3, 4, 5]) + """
    <p class="note">එක් test user කෙනෙකුගේ label එකක් නිවැරදි/වැරදි වීමෙන්
    අදාළ රෝගයේ accuracy එක 3.33 percentage points කින් වෙනස් වෙනවා.
    Sample එක කුඩා නිසා රෝගයක් සඳහා ලැබුණු සුළු වෙනසක්
    ස්ථිර model superiority එකක් ලෙස සලකන්න බැහැ.</p>
    <p class="small">XGBoost හි threshold 0.5 යටතේ Macro Recall = 0%.
    එහෙත් probability ranking මනින Macro AP = 41.9%යි.
    Threshold-based classification සහ score ranking වෙනස් දේවල්;
    මෙහි threshold එක test data මත වෙනස් කළේ නැහැ.</p>
"""))

pages.append(page(8, "නිර්දේශය, සීමාවන් සහ නැවත ධාවනය", """
    <div class="callout"><b>Prototype සඳහා නිර්දේශය: Logistic Regression baseline එක තබාගන්න.</b>
    <p>මේ නිශ්චිත settings සහ dataset එකේ එයට වඩා හොඳ accuracy/F1 ලැබුණා.
    එහෙත් කිසිදු model එකක් මේ ප්‍රතිඵල මත diagnosis හෝ prescription සඳහා භාවිත නොකළ යුතුයි.</p></div>
    <ul class="small"><li><b>Synthetic labels:</b> coefficients, source episodes සහ outcomes නිර්මාණය කළ ඒවායි.
    රෝග හයට එකම කෘත්‍රිම දින 7ක infectious window එක යොදාගත්තා; එය clinical estimate එකක් නොවෙයි.</li>
    <li><b>GPS සීමාව:</b> stationary coordinate එකක් visit එක පුරා උපකල්පනය කළා.
    Position error, walls, floors, ventilation සහ source පිටවූ පසු airborne exposure සම්පූර්ණයෙන් model කළේ නැහැ.</li>
    <li><b>Validation සීමාව:</b> test users 30ක් පමණයි. Users අතර shared contacts තිබෙන නිසා
    split එක network-disjoint හෝ time-disjoint නොවෙයි. Test set එක පෙර බැලූ නිසා මේ comparison එක exploratory යි.</li>
    <li><b>Next step:</b> consented real data, verified historical reports සහ clinical outcomes එකතු කර,
    training-only tuning කර, අලුත් untouched temporal/network test set එකක පරීක්ෂා කරන්න.</li></ul>
    <h3>නැවත ධාවනය කිරීම</h3>
    <pre>node scripts/matara-ml.cjs
python -m pip install -r research/model-comparison-requirements.txt
python scripts/compare-matara-models.py</pre>
    <p class="small">Python commands සඳහා isolated environment එක භාවිත කරන්න.
    Exact versions, parameters, predictions සහ SHA-256 hashes
    <code>model-comparison/comparison.json</code> තුළ ඇත.
    Dataset වෙනස් කළ පසු comparison එක නැවත ධාවනය කළ යුතුයි.</p>
    <h3>සත්‍යාපනය සහ මූලාශ්‍ර</h3>
    <p class="small">Project tests 24 සමත්. Typecheck සමත්. Lint: errors 0; කලින් තිබූ warnings 3.
    Library dependencies පරීක්ෂාව සමත්. දත්ත external inference සේවාවකට යවා නැහැ;
    prescription component එකට මේ models සම්බන්ධ කර නැහැ.</p>
    <p class="refs">Background references (මේවා synthetic coefficients සඳහා මූලාශ්‍ර නොවෙයි):<br>
    <a href="https://www.cdc.gov/measles/hcp/clinical-overview/">CDC — Measles clinical overview</a> ·
    <a href="https://www.cdc.gov/conjunctivitis/hcp/clinical-overview/index.html">CDC — Conjunctivitis</a> ·
    <a href="https://www.cdc.gov/norovirus/about/index.html">CDC — Norovirus</a><br>
    <a href="https://www.epid.gov.lk/weekly-epidemiological-report">Sri Lanka Epidemiology Unit — Weekly reports</a><br>
    <a href="https://catboost.ai/docs/en/concepts/python-quickstart">CatBoost documentation</a> ·
    <a href="https://xgboost.readthedocs.io/en/stable/python/python_api.html">XGBoost documentation</a> ·
    <a href="https://scikit-learn.org/stable/api/sklearn.metrics.html">scikit-learn metrics</a></p>
"""))

regular = base64.b64encode(Path("C:/Windows/Fonts/iskpota.ttf").read_bytes()).decode()
bold = base64.b64encode(Path("C:/Windows/Fonts/iskpotab.ttf").read_bytes()).decode()
style = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; color: #1d3042; font: 10.5pt/1.65 ReportSinhala, Arial, sans-serif; background: #e9eef1; }
.page { position: relative; width: 210mm; height: 297mm; padding: 13mm 16mm 20mm; background: white; break-after: page; }
.page:last-child { break-after: auto; }
.eyebrow { font: 8pt/1.5 Arial,sans-serif; letter-spacing: 1.6px; color: #137c76; padding-bottom: 3mm; border-bottom: 2px solid #137c76; }
.kicker { margin-top: 6mm; color: #637487; font-size: 9pt; }
h2 { font-size: 24pt; line-height: 1.35; margin: 2mm 0 5mm; color: #153f54; }
h3 { font-size: 12pt; margin: 4mm 0 2mm; color: #137c76; }
p { margin: 2.5mm 0; }
.lead { font-size: 13pt; line-height: 1.7; }
.date { margin: 5mm 0; color: #637487; font-size: 9pt; }
.stats { display: flex; gap: 3mm; margin: 6mm 0; }
.stats > div { flex: 1; background: #eff6f6; padding: 3mm 4mm; border-radius: 2mm; }
.stats strong { display: block; font: bold 25pt/1.2 Arial,sans-serif; color: #137c76; }
.stats span { display:block; margin-top: 1mm; font-size: 9pt; }
.callout { background: #edf6f5; border-left: 3px solid #137c76; padding: 3mm 4mm; margin: 4mm 0; }
.callout p { margin-bottom: 0; }
.warning { background: #fff7e9; border-left: 3px solid #c88d31; padding: 3mm 4mm; }
.note { color: #4d6172; background: #f2f5f8; padding: 3mm 4mm; }
.muted { color: #637487; font-size: 9pt; font-weight: normal; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9pt; line-height: 1.45; table-layout: auto; }
th { background: #173f54; color: white; text-align: left; padding: 2.5mm 2mm; font-weight: normal; }
td { padding: 2.3mm 2mm; border-bottom: 1px solid #dce5eb; vertical-align: top; }
tbody tr:nth-child(even) { background: #f4f7f9; }
.numeric { font-family: Arial,sans-serif; font-size: 8.7pt; }
.numeric td:not(:first-child), .numeric th:not(:first-child) { text-align: right; }
.compact td { padding: 1.2mm 2mm; }
.compact th { padding: 1.8mm 2mm; }
.small { font-size: 9.3pt; }
.small td { padding: 1.9mm 2mm; }
ul, ol { padding-left: 6mm; margin: 2mm 0; }
li { margin: 1.7mm 0; }
.flow { padding: 3mm; background: #edf6f5; font: 9.5pt/1.8 Arial,sans-serif; margin: 3mm 0; }
pre { white-space: pre-wrap; font: 8.4pt/1.6 Consolas,monospace; background: #f2f5f8; padding: 3mm; border-radius: 1mm; }
code { font: 8.5pt Consolas,monospace; }
.chart { display:block; width:100%; margin: 5mm 0 3mm; }
.refs { font-size: 8.4pt; line-height: 1.65; color: #506476; }
a { color: #137c76; text-decoration: none; }
footer { position:absolute; bottom: 9mm; left:16mm; right:16mm; border-top:1px solid #dce5eb; padding-top:2mm; display:flex; justify-content:space-between; color:#637487; font-size:8pt; }
@media print { body { background: white; } * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
"""
font_css = f"""
@font-face {{ font-family: ReportSinhala; src: url(data:font/ttf;base64,{regular}) format('truetype'); font-weight:400; }}
@font-face {{ font-family: ReportSinhala; src: url(data:font/ttf;base64,{bold}) format('truetype'); font-weight:700; }}
"""
document = '<!doctype html><html lang="si"><head><meta charset="utf-8"><title>MediTrack — Matara Model Comparison</title><style>' + font_css + style + "</style></head><body>" + "".join(pages) + "</body></html>"
target = OUT / "MediTrack-Matara-Model-Comparison-Sinhala.html"
target.write_text(document, encoding="utf-8")
print(f"Built {target} ({len(pages)} designed pages)")
