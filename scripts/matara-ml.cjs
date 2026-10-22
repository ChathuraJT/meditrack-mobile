// Reproducible software experiment; NOT a clinical model or surveillance dataset.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { addProximity, DEFAULT_CONFIG } = require('./matara-proximity.cjs');
const diseases = [
  'influenza',
  'chickenpox',
  'measles',
  'mumps',
  'viral_conjunctivitis',
  'viral_gastroenteritis',
];
const areas = [
  'Matara Town',
  'Weligama',
  'Akuressa',
  'Dikwella',
  'Hakmana',
  'Kamburupitiya',
];
const cutoff = '2026-09-01T00:00:00+05:30';
const day = 86400000;
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, z))));
const round = (x) => +x.toFixed(6);
function generateBase() {
  const random = rng(20261020);
  const integer = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const yes = (p) => +(random() < p);
  const patients = [],
    visits = [],
    encounters = [],
    reports = [],
    features = [],
    outcomes = [];
  const start = Date.parse(cutoff) - 28 * day;
  for (let week = 0; week < 4; week++)
    for (const area of areas)
      for (const disease of diseases) {
        const cases = integer(0, 150);
        reports.push({
          report_id: `R${reports.length + 1}`,
          area_name: area,
          disease,
          published_at: new Date(start + week * 7 * day).toISOString(),
          period_start: new Date(start + (week * 7 - 7) * day).toISOString(),
          period_end: new Date(start + week * 7 * day - 1).toISOString(),
          synthetic_cases: cases,
          synthetic_population: 10000,
          cases_per_10000: cases,
          source: 'fictional_simulation_not_surveillance',
          is_synthetic: true,
        });
      }
  for (let i = 1; i <= 100; i++) {
    const patient_id = `SYN${String(i).padStart(3, '0')}`;
    const patient = {
      patient_id,
      home_area: areas[integer(0, 5)],
      age: integer(5, 80),
      immunocompromised: yes(0.15),
      chronic_respiratory_condition: yes(0.2),
      mmr_doses: integer(0, 2),
      varicella_immune_history: yes(0.55),
      influenza_vaccine_recent: yes(0.4),
      is_synthetic: true,
    };
    patients.push(patient);
    const exposure = diseases.map(() => 0);
    let totalMinutes = 0,
      bleMinutes = 0,
      indoorMinutes = 0,
      sharedFoodVisits = 0;
    // One non-overlapping illustrative visit per day; named areas, not fabricated GPS fixes.
    for (let d = 0; d < 28; d++) {
      const area = random() < 0.6 ? patient.home_area : areas[integer(0, 5)];
      const minutes = integer(15, 180),
        indoor = yes(0.65),
        food = yes(0.25);
      const visit_id = `V${visits.length + 1}`;
      const arrival = start + d * day + integer(8, 18) * 3600000;
      visits.push({
        visit_id,
        patient_id,
        area_name: area,
        visit_start: new Date(arrival).toISOString(),
        visit_end: new Date(arrival + minutes * 60000).toISOString(),
        duration_minutes: minutes,
        indoors: indoor,
        shared_food_setting: food,
        location_source: 'synthetic_area_assignment',
        is_synthetic: true,
      });
      totalMinutes += minutes;
      indoorMinutes += minutes * indoor;
      sharedFoodVisits += food;
      const contact = integer(0, minutes);
      bleMinutes += contact;
      encounters.push({
        encounter_id: `E${encounters.length + 1}`,
        visit_id,
        patient_id,
        peer_rotating_id: `SIM_PEER_${i}_${d}`,
        timestamp: new Date(arrival).toISOString(),
        duration_minutes: contact,
        median_rssi_dbm: integer(-90, -45),
        peer_infection_status: 'unknown',
        is_synthetic: true,
      });
      diseases.forEach((disease, j) => {
        const report = reports.find(
          (r) =>
            r.area_name === area &&
            r.disease === disease &&
            r.published_at ===
              new Date(start + Math.floor(d / 7) * 7 * day).toISOString(),
        );
        // Generic engineering recency weighting, NOT a disease incubation model.
        exposure[j] +=
          (((minutes / 60) * report.cases_per_10000) / 100) *
          Math.exp(-(27 - d) / 14);
      });
    }
    const row = {
      patient_id,
      prediction_at: cutoff,
      age: patient.age,
      immunocompromised: patient.immunocompromised,
      chronic_respiratory_condition: patient.chronic_respiratory_condition,
      mmr_doses: patient.mmr_doses,
      varicella_immune_history: patient.varicella_immune_history,
      influenza_vaccine_recent: patient.influenza_vaccine_recent,
      visit_hours_28d: round(totalMinutes / 60),
      indoor_hours_28d: round(indoorMinutes / 60),
      ble_encounter_hours_28d: round(bleMinutes / 60),
      shared_food_visits_28d: sharedFoodVisits,
    };
    diseases.forEach((disease, j) => {
      row[`${disease}_area_exposure`] = round(exposure[j]);
      // Arbitrary toy mechanism, including unobserved noise. No real prevalence/effect estimates.
      const immunity =
        j === 0
          ? patient.influenza_vaccine_recent
          : j === 1
            ? patient.varicella_immune_history
            : j === 2 || j === 3
              ? patient.mmr_doses / 2
              : 0;
      const context =
        j === 5
          ? sharedFoodVisits / 10
          : j === 4
            ? bleMinutes / 1200
            : indoorMinutes / 2000;
      const probability = sigmoid(
        -3.2 +
          exposure[j] / 7 +
          context +
          0.45 * patient.immunocompromised -
          1.7 * immunity +
          (random() - 0.5) * 1.5,
      );
      const outcome = yes(probability);
      row[`outcome_${disease}`] = outcome;
      outcomes.push({
        patient_id,
        disease,
        prediction_at: cutoff,
        followup_end: new Date(Date.parse(cutoff) + 28 * day).toISOString(),
        simulated_outcome: outcome,
        outcome_recorded_at: outcome
          ? new Date(Date.parse(cutoff) + integer(1, 28) * day).toISOString()
          : '',
        followup_complete: true,
        label_source: 'bernoulli_toy_simulation_not_clinical_diagnosis',
        is_synthetic: true,
      });
    });
    row.is_synthetic = true;
    features.push(row);
  }
  return { patients, visits, encounters, reports, features, outcomes };
}
function generate(config = DEFAULT_CONFIG) {
  return addProximity(generateBase(), config);
}
function fit(X, y, iterations = 2000) {
  const n = X.length,
    p = X[0].length;
  const means = Array.from(
    { length: p },
    (_, j) => X.reduce((sum, x) => sum + x[j], 0) / n,
  );
  const scales = means.map(
    (m, j) =>
      Math.sqrt(X.reduce((sum, x) => sum + (x[j] - m) ** 2, 0) / n) || 1,
  );
  const Z = X.map((x) => [1, ...x.map((v, j) => (v - means[j]) / scales[j])]);
  const weights = Array(p + 1).fill(0);
  for (let step = 0; step < iterations; step++) {
    const gradient = Array(p + 1).fill(0);
    Z.forEach((z, i) => {
      const error =
        sigmoid(z.reduce((sum, v, j) => sum + v * weights[j], 0)) - y[i];
      z.forEach((v, j) => {
        gradient[j] += (error * v) / n;
      });
    });
    weights.forEach((w, j) => {
      weights[j] -= 0.08 * (gradient[j] + (j ? 0.1 * w : 0));
    });
  }
  return { means, scales, weights };
}
function predict(model, x) {
  return sigmoid(
    model.weights[0] +
      x.reduce(
        (sum, v, j) =>
          sum + ((v - model.means[j]) / model.scales[j]) * model.weights[j + 1],
        0,
      ),
  );
}
function metrics(y, probability) {
  let tp = 0,
    tn = 0,
    fp = 0,
    fn = 0;
  y.forEach((v, i) => {
    if (v) {
      if (probability[i] >= 0.5) tp++;
      else fn++;
    } else if (probability[i] >= 0.5) fp++;
    else tn++;
  });
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const specificity = tn + fp ? tn / (tn + fp) : null;
  return {
    n: y.length,
    positives: tp + fn,
    negatives: tn + fp,
    tp,
    tn,
    fp,
    fn,
    accuracy: (tp + tn) / y.length,
    balanced_accuracy:
      recall === null || specificity === null
        ? null
        : (recall + specificity) / 2,
    precision,
    recall,
    f1: 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : 0,
    brier:
      y.reduce((sum, v, i) => sum + (v - probability[i]) ** 2, 0) / y.length,
  };
}
function evaluate(data) {
  const random = rng(731);
  const rows = [...data.features];
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  const train = rows.slice(0, 70),
    test = rows.slice(70);
  const models = {},
    scores = {},
    predictions = [],
    split = rows.map((r, i) => ({
      patient_id: r.patient_id,
      split: i < 70 ? 'train' : 'test',
    }));
  const shared = [
    'age',
    'immunocompromised',
    'chronic_respiratory_condition',
    'mmr_doses',
    'varicella_immune_history',
    'influenza_vaccine_recent',
    'visit_hours_28d',
    'indoor_hours_28d',
    'ble_encounter_hours_28d',
    'shared_food_visits_28d',
    'proximity_unique_users_28d',
    'proximity_pair_hours_28d',
  ];
  diseases.forEach((disease) => {
    const columns = [
      ...shared,
      `${disease}_area_exposure`,
      `${disease}_infectious_contact_hours`,
      `${disease}_contact_exposure_index`,
    ];
    const label = `outcome_${disease}`;
    const yTrain = train.map((r) => r[label]),
      yTest = test.map((r) => r[label]);
    const model = fit(
      train.map((r) => columns.map((k) => r[k])),
      yTrain,
    );
    const probabilities = test.map((r) =>
      predict(
        model,
        columns.map((k) => r[k]),
      ),
    );
    const prevalence = yTrain.reduce((a, b) => a + b, 0) / yTrain.length;
    scores[disease] = {
      logistic_regression: metrics(yTest, probabilities),
      majority_baseline: metrics(
        yTest,
        test.map(() => prevalence),
      ),
      train_positives: yTrain.reduce((a, b) => a + b, 0),
    };
    models[disease] = { ...model, feature_columns: columns, threshold: 0.5 };
    test.forEach((r, i) =>
      predictions.push({
        patient_id: r.patient_id,
        disease,
        actual: yTest[i],
        simulation_score: probabilities[i],
        predicted: +(probabilities[i] >= 0.5),
        is_synthetic: true,
      }),
    );
  });
  const aggregate = (model) => ({
    label_accuracy:
      diseases.reduce((s, d) => s + scores[d][model].accuracy, 0) / 6,
    macro_f1: diseases.reduce((s, d) => s + scores[d][model].f1, 0) / 6,
    macro_balanced_accuracy:
      diseases.reduce((s, d) => s + scores[d][model].balanced_accuracy, 0) / 6,
  });
  const exactMatch =
    test.filter((r) =>
      predictions
        .filter((p) => p.patient_id === r.patient_id)
        .every((p) => p.actual === p.predicted),
    ).length / test.length;
  return {
    models,
    scores,
    predictions,
    split,
    summary: {
      train_users: 70,
      test_users: 30,
      threshold: 0.5,
      logistic_regression: {
        ...aggregate('logistic_regression'),
        exact_match_accuracy: exactMatch,
      },
      majority_baseline: aggregate('majority_baseline'),
    },
  };
}
function csv(rows, emptyColumns = []) {
  const keys = rows.length ? Object.keys(rows[0]) : emptyColumns;
  const escape = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return (
    [
      keys.map(escape).join(','),
      ...rows.map((r) => keys.map((k) => escape(r[k])).join(',')),
    ].join('\n') + '\n'
  );
}
function validate(data, result) {
  assert.equal(data.patients.length, 100);
  assert.equal(new Set(data.patients.map((r) => r.patient_id)).size, 100);
  assert.equal(data.features.length, 100);
  assert.equal(data.outcomes.length, 600);
  const training = new Set(
    result.split.filter((r) => r.split === 'train').map((r) => r.patient_id),
  );
  assert.equal(training.size, 70);
  assert.ok(
    result.split
      .filter((r) => r.split === 'test')
      .every((r) => !training.has(r.patient_id)),
  );
  assert.ok(
    data.visits.every((r) => Date.parse(r.visit_end) < Date.parse(cutoff)),
  );
  assert.ok(
    data.reports.every((r) => Date.parse(r.published_at) < Date.parse(cutoff)),
  );
  assert.ok(
    data.outcomes.every(
      (r) =>
        !r.outcome_recorded_at ||
        Date.parse(r.outcome_recorded_at) > Date.parse(cutoff),
    ),
  );
  assert.ok(
    Object.values(result.models).every((m) =>
      m.feature_columns.every((k) => !k.startsWith('outcome_')),
    ),
  );
  assert.deepEqual(metrics([0, 0, 1, 1], [0.1, 0.9, 0.2, 0.8]), {
    n: 4,
    positives: 2,
    negatives: 2,
    tp: 1,
    tn: 1,
    fp: 1,
    fn: 1,
    accuracy: 0.5,
    balanced_accuracy: 0.5,
    precision: 0.5,
    recall: 0.5,
    f1: 0.5,
    brier: 0.37500000000000006,
  });
  const toy = fit([[-3], [-2], [-1], [1], [2], [3]], [0, 0, 0, 1, 1, 1]);
  assert.ok(predict(toy, [-2]) < 0.5 && predict(toy, [2]) > 0.5);
}
function run() {
  const out = path.resolve(__dirname, '../research/matara-synthetic');
  const config = { ...DEFAULT_CONFIG };
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=');
    if (key === '--radius-m') config.radius_m = Number(value);
    else if (key === '--min-overlap-minutes')
      config.min_overlap_minutes = Number(value);
    else throw new Error(`Unknown option: ${key}`);
  }
  if (!Object.values(config).every((v) => Number.isFinite(v) && v > 0)) {
    throw new Error(
      'Distance and duration thresholds must be positive finite numbers.',
    );
  }
  const data = generate(config),
    result = evaluate(data);
  validate(data, result);
  fs.mkdirSync(out, { recursive: true });
  const files = {
    'users.csv': data.patients,
    'location_anchors.csv': data.anchors,
    'proximity_pairs.csv': data.pairs,
    'pair_disease_exposure.csv': data.pairDiseaseExposure,
    'source_infection_episodes.csv': data.sourceEpisodes,
    'location_visits.csv': data.visits,
    'ble_encounters.csv': data.encounters,
    'area_disease_reports.csv': data.reports,
    'dataset_100_users.csv': data.features,
    'outcomes.csv': data.outcomes,
    'split.csv': result.split,
    'test_predictions.csv': result.predictions,
  };
  const emptyHeaders = {
    'proximity_pairs.csv': [
      'pair_id',
      'user_a',
      'user_b',
      'visit_a',
      'visit_b',
      'latitude_a',
      'longitude_a',
      'latitude_b',
      'longitude_b',
      'gps_accuracy_a_m',
      'gps_accuracy_b_m',
      'radius_m',
      'min_overlap_minutes',
      'overlap_start',
      'overlap_end',
      'overlap_minutes',
      'distance_m',
      'distance_lower_m',
      'distance_upper_m',
      'gps_range_assessment',
      'is_synthetic',
      'ble_detected',
      'same_indoor_space',
      'shared_food_contact',
      'hand_surface_contact',
      'context_source',
    ],
    'pair_disease_exposure.csv': [
      'pair_id',
      'source_user',
      'target_user',
      'disease',
      'source_status_during_overlap',
      'source_episode_id',
      'infectious_overlap_minutes',
      'transmission_context_present',
      'synthetic_exposure_index',
      'score_kind',
      'is_synthetic',
    ],
    'ble_encounters.csv': [
      'encounter_id',
      'pair_id',
      'user_a',
      'user_b',
      'timestamp',
      'duration_minutes',
      'median_rssi_dbm',
      'is_synthetic',
    ],
  };
  for (const [file, rows] of Object.entries(files))
    fs.writeFileSync(path.join(out, file), csv(rows, emptyHeaders[file]));
  fs.writeFileSync(
    path.join(out, 'proximity-summary.json'),
    JSON.stringify(
      {
        config,
        visit_rows: data.visits.length,
        pair_rows: data.pairs.length,
        ble_rows: data.encounters.length,
        source_episode_rows: data.sourceEpisodes.length,
        disease_exposure_rows: data.pairDiseaseExposure.length,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(out, 'models.json'),
    JSON.stringify(
      { use: 'simulation_only_not_clinical', models: result.models },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(out, 'metrics.json'),
    JSON.stringify(
      {
        seeds: { generation: 20261020, proximity: 20261021, split: 731 },
        proximity_config: data.proximityConfig,
        nearby_pairs: data.pairs.length,
        ...result.summary,
        per_disease: result.scores,
      },
      null,
      2,
    ),
  );
  const pct = (n) => `${(100 * n).toFixed(1)}%`;
  const report = `# Synthetic Matara experiment\n\nSIMULATION ONLY. No real patients, GPS fixes, disease reports, diagnoses, or clinical probabilities.\n\n100 users; 70 train, 30 held out. One row per user, six simulated binary outcomes over the next 28 days. No outcome or identity columns enter training. No test-set tuning. Scaling is fitted on training users only. Fixed L2 logistic regression (lambda 0.1), 2,000 gradient steps, threshold 0.5.\n\n| Disease | Test positives / 30 | Accuracy | Baseline accuracy | Balanced accuracy | Precision | Recall | F1 |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${diseases
    .map((d) => {
      const m = result.scores[d].logistic_regression;
      return `| ${d} | ${m.positives} | ${pct(m.accuracy)} | ${pct(result.scores[d].majority_baseline.accuracy)} | ${pct(m.balanced_accuracy)} | ${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.f1)} |`;
    })
    .join(
      '\n',
    )}\n\nOverall label accuracy: **${pct(result.summary.logistic_regression.label_accuracy)}** across 180 user/disease decisions. Majority baseline: **${pct(result.summary.majority_baseline.label_accuracy)}**. All six labels correct for a user (exact match): **${pct(result.summary.logistic_regression.exact_match_accuracy)}**. Macro F1: **${pct(result.summary.logistic_regression.macro_f1)}**.\n\nThese metrics measure recovery of an invented stochastic mechanism, not disease prediction in Sri Lanka. High negative-class accuracy can hide poor sensitivity; examine recall, F1, confusion counts and the baseline. Only 30 test users: one result changes per-disease accuracy by 3.33 percentage points. Six labels from one user are correlated, not 180 independent patients. No uncertainty interval or clinical calibration is claimed. Train and test users can be connected by historical encounters. Only pre-cutoff source reports enter features, never future peer labels. The held-out users share the simulation's contact network, places and period; this does not test future outbreaks or unseen locations.\n\nReproduce: \`node scripts/matara-ml.cjs\`. Generation and split seeds are fixed before evaluation. See README.md for schema, assumptions and sources.\n`;
  fs.writeFileSync(path.join(out, 'RESULTS.md'), report);
  console.log(JSON.stringify(result.summary, null, 2));
  console.log('Validation passed. Files written to research/matara-synthetic.');
}
if (require.main === module) run();
module.exports = { generate, fit, predict, metrics, evaluate, validate };
