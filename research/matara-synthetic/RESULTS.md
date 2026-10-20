# Synthetic Matara experiment

SIMULATION ONLY. No real patients, GPS fixes, disease reports, diagnoses, or clinical probabilities.

100 users; 70 train, 30 held out. One row per user, six simulated binary outcomes over the next 28 days. No outcome or identity columns enter training. No test-set tuning. Scaling is fitted on training users only. Fixed L2 logistic regression (lambda 0.1), 2,000 gradient steps, threshold 0.5.

| Disease | Test positives / 30 | Accuracy | Baseline accuracy | Balanced accuracy | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|---:|
| influenza | 6 | 83.3% | 80.0% | 64.6% | 66.7% | 33.3% | 44.4% |
| chickenpox | 11 | 66.7% | 63.3% | 54.5% | 100.0% | 9.1% | 16.7% |
| measles | 3 | 90.0% | 90.0% | 50.0% | 0.0% | 0.0% | 0.0% |
| mumps | 7 | 76.7% | 76.7% | 50.0% | 0.0% | 0.0% | 0.0% |
| viral_conjunctivitis | 4 | 83.3% | 86.7% | 69.2% | 40.0% | 50.0% | 44.4% |
| viral_gastroenteritis | 7 | 76.7% | 76.7% | 59.9% | 50.0% | 28.6% | 36.4% |

Overall label accuracy: **79.4%** across 180 user/disease decisions. Majority baseline: **78.9%**. All six labels correct for a user (exact match): **23.3%**. Macro F1: **23.7%**.

These metrics measure recovery of an invented stochastic mechanism, not disease prediction in Sri Lanka. High negative-class accuracy can hide poor sensitivity; examine recall, F1, confusion counts and the baseline. Only 30 test users: one result changes per-disease accuracy by 3.33 percentage points. Six labels from one user are correlated, not 180 independent patients. No uncertainty interval or clinical calibration is claimed. Train and test users can be connected by historical encounters. Only pre-cutoff source reports enter features, never future peer labels. The held-out users share the simulation's contact network, places and period; this does not test future outbreaks or unseen locations.

Reproduce: `node scripts/matara-ml.cjs`. Generation and split seeds are fixed before evaluation. See README.md for schema, assumptions and sources.
