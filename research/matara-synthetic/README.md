# Matara coordinate and contact dataset: 100 synthetic users

This is a reproducible software experiment, not real medical data or a clinically validated model. All users, histories, coordinates, GPS accuracy values, encounters, source episodes, area case counts and outcomes are invented. Place names provide Matara-area context only; none of these files describes actual disease activity in those places.

## Reproduce

From the project root:

```sh
node scripts/matara-ml.cjs
```

Optional encounter-search settings:

```sh
node scripts/matara-ml.cjs --radius-m=20 --min-overlap-minutes=10
```

The default is 50 measured metres and 5 simultaneous minutes. These are engineering search parameters, NOT medical transmission thresholds or safe distances. Changing settings regenerates the experiment outputs; file counts and results below refer to defaults. The regeneration replaces only this experiment's generated files. Node 22 is sufficient; no additional packages are needed. Training uses an educational L2 logistic regression implementation, not CatBoost. Seeds, thresholds and hyperparameters were not tuned on test accuracy.

See RESULTS.md and metrics.json for measured results. proximity-summary.json records the active settings and row counts.

The extended library comparison is in `model-comparison/RESULTS.md`. It uses the same CSVs, feature definitions and 70/30 user split to compare the original Logistic Regression with Random Forest, XGBoost and CatBoost. Reproduce with `research/.venv/Scripts/python.exe scripts/compare-matara-models.py` after installing `research/model-comparison-requirements.txt`. Regenerating this dataset invalidates older comparison results; rerun the comparison and verify the recorded SHA-256 hashes.

## Files

| File | Default rows | Contents |
|---|---:|---|
| dataset_100_users.csv | 100 | One row per user: history, derived exposure features, last coordinate, six outcome labels |
| users.csv | 100 | Synthetic history and home area |
| location_anchors.csv | 6 | Approximate synthetic town-area anchors |
| location_visits.csv | 2,800 | Latitude, longitude, accuracy, arrival and departure for 28 daily visits per user |
| proximity_pairs.csv | 1,841 | Actual comparisons between two different users' simultaneous coordinate visits |
| ble_encounters.csv | 91 | Fictional BLE observations for a subset of matched pairs |
| source_infection_episodes.csv | 157 | Historical fictional infectious episodes reported before the relevant contacts |
| pair_disease_exposure.csv | 22,092 | Six diseases, in both directions, for every pair |
| area_disease_reports.csv | 144 | Six areas, six diseases and four weekly publications |
| outcomes.csv | 600 | One simulated future binary outcome per user/disease |
| split.csv | 100 | Fixed user-disjoint 70 train / 30 test assignment |
| test_predictions.csv | 180 | Test labels, uncalibrated model scores and thresholded predictions |
| models.json | Six models | Ordered features, training-only scaling, weights, threshold |

Areas: Matara Town, Weligama, Akuressa, Dikwella, Hakmana and Kamburupitiya. Coordinates are randomly offset around approximate town-area anchors. They are not surveyed points, actual tracks, official MOH/GN centroids or verified land/boundary locations. A user is assumed stationary at the coordinate for the full visit. No continuous trajectories, walls, floors or rooms are modeled.

## Comparing users using latitude and longitude

1. Compare visits that overlap in time. The matcher does not require identical area names.
2. Compute Haversine distance from both latitude/longitude pairs, in metres.
3. Keep a pair when measured distance is at most 50 metres AND simultaneous overlap is at least 5 minutes (default).
4. Store both user IDs, both coordinates, distance, overlap interval and GPS accuracy. Each visit pair appears once; self-comparisons are excluded.
5. For each disease, evaluate A as the possible source for B and B as the possible source for A.
6. Include disease-specific known-source evidence only if the source has a separately generated historical infectious episode reported before the encounter started and the fictional infectious interval overlaps the contact.
7. Aggregate contact evidence with the recipient's synthetic medical history and area exposure before fitting the model.

The measured distance gate may miss a truly close pair when GPS error puts its measured distance outside the radius. Lower/upper distance indicators are max(0, distance - summed accuracy radii) and distance + summed accuracy radii. They are illustrative sensitivity bounds, NOT confidence intervals. A pair is marked uncertain_at_radius_boundary when the upper bound exceeds the threshold. No calibrated GPS uncertainty model is fitted.

The last_latitude, last_longitude and last_location_at columns in the wide CSV are for inspection. Matching uses ALL visits, not just those last coordinates. Absolute coordinates, names and IDs are excluded from the training inputs; derived distance/time exposure features enter training instead.

## Example from the default generated files

PAIR56 compares SYN008 at (6.078063, 80.564512) with SYN020 at (6.078126, 80.564476). Measured distance is 8.057199 metres and simultaneous overlap is 44 minutes. The simulated accuracy radii are 17 and 15 metres, so the illustrative distance bounds are 0 to 40.057199 metres. BLE was not observed for this pair.

SYN020 has a historical simulated chickenpox episode that overlaps this encounter and was reported beforehand. The SYN020 -> SYN008 chickenpox exposure row has a toy index of 0.490164. This means a modeled exposure contribution, NOT a 49% infection probability. Neither this contact nor the future label proves that SYN020 infected SYN008.

## History, sensors and time

patient_id is synthetic. Age is in years (5-80). History fields are booleans (0/1); mmr_doses is 0/1/2. varicella_immune_history and influenza_vaccine_recent are simplified fictional indicators, not verified clinical measurements. Chronic respiratory history is a candidate input, not a claim of independent infection causation.

Prediction cutoff: 2026-09-01 00:00 Asia/Colombo. Features cover the previous 28 days; outcome follow-up ends 2026-09-29 00:00 Asia/Colombo. CSV timestamps have an offset or UTC Z. The generic 28-day windows and recency weighting are software assumptions, not six validated incubation models.

Source episodes use an invented seven-day infectious interval for all six diseases solely to test temporal joins. This is not a clinical infectious-period estimate. Historical episodes and future outcomes are separate: the simulation does not model reinfection, recovery, persistent infection or evolving immunity. Future peer outcome labels never determine whether an earlier contact is infectious.

Visit indoor/shared-food flags are fictional. Pair context flags (same indoor space, food contact, hand/surface contact) are separately simulated and are not inferred from GPS; they can differ from the individual visit flags. Real data must reconcile these observations. GPS proximity cannot identify an indoor room, shared utensils, physical contact or infected person.

BLE is generated for some pairs within 12 measured metres (70% random detection), with partial overlap duration and fictional RSSI. This is an engineering assumption, not a BLE hardware specification. RSSI is not converted to exact distance. Both BLE users belong to the 100-user dataset. Missing BLE is not proof of no encounter. GPS dropout, real positioning bias and incomplete follow-up are not modeled.

## Exposure features and labels

Disease-specific area exposure is summed over visits:

`visit_hours * (fictional_reported_cases_per_10000 / 100) * exp(-days_before_final_observation_day / 14)`

Reports use a fictional population denominator of 10,000 and case counts from 0 to 150. Each report describes the preceding week and is published before visits that use it. No future reports are joined.

The pair-level exposure index is:

`infectious_overlap_hours * exp(-distance_metres / 20) * context_weight * (1 - 0.6 * simplified_immunity)`

The invented respiratory context weight is 1 for a same-indoor-space flag and 0.15 otherwise. Conjunctivitis uses a hand/surface flag; gastroenteritis uses a shared-food flag. These mechanisms simplify and omit real transmission routes. The index is dimensionless, may exceed 1, and is NOT a probability. Unknown source infection contributes no known-source evidence, not proof of safety. Airborne persistence after someone leaves, indirect contaminated surfaces/food, ventilation and other pathways are not modeled.

Each model receives history, visit/indoor/BLE hours, shared-food visit counts, number of unique nearby users, summed pair-contact hours, its disease's area-exposure index, infectious-contact hours and contact-exposure index. Pair-hours sum across peers and can exceed clock time when several users are nearby simultaneously.

Each outcome_<disease> is a separate stochastic 0/1 future label. The new label mechanism uses area exposure, log(1 + contact-exposure index), simplified history and random noise. All coefficients are arbitrary and visible in scripts/matara-proximity.cjs. Labels are generated after contact aggregation; previous area-only results are superseded and are not directly comparable. A user can have zero, one or multiple positive outcomes. Negative means a simulated negative over follow-up, not definitely healthy. Complete follow-up is assumed for every synthetic user.

simulation_score is the trained model's uncalibrated output, not a personal medical probability. Threshold 0.5 is fixed before evaluation. The majority baseline predicts each disease's training majority class; its score is training prevalence. Precision/F1 use zero for zero denominators. All six test diseases have both positive and negative labels in the default run.

## Evaluation limits

100 users, 70 training / 30 test, six logistic regression models. Scaling is fitted using training users only. There is no test-driven feature or threshold tuning. The generator and learner share an approximately logistic structure, so this is a favorable test of recovering invented rules. It is not clinical accuracy.

Train/test users can share historical contacts and reports. The split is user-disjoint but NOT contact-network-disjoint or time-disjoint. It does not demonstrate generalization to other outbreaks, times, places or independent networks. Six decisions from one user are not six independent patients. One test user's outcome changes per-disease accuracy by 3.33 percentage points. Sensitivity, F1, balanced accuracy and the baseline are more informative than accuracy alone for this imbalanced example.

Real development requires consented sensor data, credible historical infection/surveillance reports, clinical outcomes, follow-up completeness, validated disease-specific mechanisms, and independent temporal/network validation. Do not use these toy scores to diagnose, infer a confirmed transmission chain or prescribe medication. The app and prescription component are unchanged.

## References

These provide background, not the synthetic coefficients, counts, coordinates or labels:

- Influenza: https://www.cdc.gov/flu/about/index.html
- Chickenpox: https://www.cdc.gov/chickenpox/hcp/clinical-overview/index.html
- Measles and airborne persistence: https://www.cdc.gov/measles/hcp/clinical-overview/
- Mumps: https://www.cdc.gov/mumps/hcp/clinical-overview/index.html
- Viral conjunctivitis: https://www.cdc.gov/conjunctivitis/hcp/clinical-overview/index.html
- Norovirus (one cause of viral gastroenteritis): https://www.cdc.gov/norovirus/about/index.html
- Sri Lankan surveillance for future real-data work: https://www.epid.gov.lk/weekly-epidemiological-report
- Metric definitions: https://scikit-learn.org/stable/api/sklearn.metrics.html
