// Synthetic coordinates and contact mechanics; no medically calibrated transmission rates.
const ANCHORS = {
  'Matara Town': [5.9549, 80.555],
  Weligama: [5.974, 80.429],
  Akuressa: [6.1, 80.475],
  Dikwella: [5.971, 80.695],
  Hakmana: [6.083, 80.65],
  Kamburupitiya: [6.078, 80.565],
};
const DISEASES = [
  'influenza',
  'chickenpox',
  'measles',
  'mumps',
  'viral_conjunctivitis',
  'viral_gastroenteritis',
];
const DEFAULT_CONFIG = { radius_m: 50, min_overlap_minutes: 5 };
const DAY = 86400000;
const rounded = (v) => +v.toFixed(6);
function randomGenerator(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function haversineMeters(latA, lonA, latB, lonB) {
  for (const [lat, lon] of [
    [latA, lonA],
    [latB, lonB],
  ]) {
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    )
      throw new Error('Invalid latitude/longitude');
  }
  const rad = Math.PI / 180;
  const h =
    Math.sin(((latB - latA) * rad) / 2) ** 2 +
    Math.cos(latA * rad) *
      Math.cos(latB * rad) *
      Math.sin(((lonB - lonA) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function compareVisits(a, b, config = DEFAULT_CONFIG) {
  if (!(config.radius_m > 0) || !(config.min_overlap_minutes > 0))
    throw new Error('Positive distance and duration thresholds required');
  if (a.patient_id === b.patient_id) return null;
  const aStart = Date.parse(a.visit_start),
    bStart = Date.parse(b.visit_start);
  const aEnd = Date.parse(a.visit_end),
    bEnd = Date.parse(b.visit_end);
  if (
    ![aStart, bStart, aEnd, bEnd].every(Number.isFinite) ||
    aEnd <= aStart ||
    bEnd <= bStart
  )
    throw new Error('Invalid visit interval');
  const start = Math.max(aStart, bStart),
    end = Math.min(aEnd, bEnd);
  const minutes = (end - start) / 60000;
  if (minutes < config.min_overlap_minutes) return null;
  const distance = haversineMeters(
    a.latitude,
    a.longitude,
    b.latitude,
    b.longitude,
  );
  const uncertainty = a.gps_accuracy_m + b.gps_accuracy_m;
  if (
    ![a.gps_accuracy_m, b.gps_accuracy_m].every(
      (v) => Number.isFinite(v) && v >= 0,
    )
  )
    throw new Error('Invalid GPS accuracy');
  // Distance gate is on measured coordinates. Bounds are sensitivity indicators, not confidence intervals.
  if (distance > config.radius_m) return null;
  return {
    overlap_start: new Date(start).toISOString(),
    overlap_end: new Date(end).toISOString(),
    overlap_minutes: rounded(minutes),
    distance_m: rounded(distance),
    distance_lower_m: rounded(Math.max(0, distance - uncertainty)),
    distance_upper_m: rounded(distance + uncertainty),
    gps_range_assessment:
      distance + uncertainty <= config.radius_m
        ? 'within_radius_under_assumed_error_bounds'
        : 'uncertain_at_radius_boundary',
  };
}
function findPairs(visits, config = DEFAULT_CONFIG) {
  const sorted = [...visits].sort(
    (a, b) =>
      Date.parse(a.visit_start) - Date.parse(b.visit_start) ||
      a.visit_id.localeCompare(b.visit_id),
  );
  const pairs = [];
  // Time sweep; no area-name gate, so coordinates on either side of an area boundary can match.
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (
      let j = i + 1;
      j < sorted.length &&
      Date.parse(sorted[j].visit_start) < Date.parse(a.visit_end);
      j++
    ) {
      const b = sorted[j],
        match = compareVisits(a, b, config);
      if (match)
        pairs.push({
          pair_id: `PAIR${pairs.length + 1}`,
          user_a: a.patient_id,
          user_b: b.patient_id,
          visit_a: a.visit_id,
          visit_b: b.visit_id,
          latitude_a: a.latitude,
          longitude_a: a.longitude,
          latitude_b: b.latitude,
          longitude_b: b.longitude,
          gps_accuracy_a_m: a.gps_accuracy_m,
          gps_accuracy_b_m: b.gps_accuracy_m,
          radius_m: config.radius_m,
          min_overlap_minutes: config.min_overlap_minutes,
          ...match,
          is_synthetic: true,
        });
    }
  }
  return pairs;
}
function infectiousMinutes(pair, episode) {
  if (
    !episode ||
    Date.parse(episode.reported_at) > Date.parse(pair.overlap_start)
  )
    return 0;
  return (
    Math.max(
      0,
      Math.min(
        Date.parse(pair.overlap_end),
        Date.parse(episode.infectious_end),
      ) -
        Math.max(
          Date.parse(pair.overlap_start),
          Date.parse(episode.infectious_start),
        ),
    ) / 60000
  );
}
function addProximity(data, config = DEFAULT_CONFIG) {
  const random = randomGenerator(20261021),
    integer = (a, b) => a + Math.floor(random() * (b - a + 1));
  const cutoff = Date.parse(data.features[0].prediction_at),
    start = cutoff - 28 * DAY;
  // Illustrative town-area anchors, not surveyed points or official boundary centroids.
  data.anchors = Object.entries(ANCHORS).map(
    ([area_name, [latitude, longitude]]) => ({
      area_name,
      latitude,
      longitude,
      coordinate_kind: 'approximate_synthetic_anchor_not_verified_boundary',
      is_synthetic: true,
    }),
  );
  data.visits.forEach((v) => {
    const [latitude, longitude] = ANCHORS[v.area_name];
    const east = integer(-65, 65),
      north = integer(-65, 65);
    v.latitude = rounded(latitude + north / 111320);
    v.longitude = rounded(
      longitude + east / (111320 * Math.cos((latitude * Math.PI) / 180)),
    );
    v.gps_accuracy_m = integer(3, 20);
    v.location_source = 'synthetic_stationary_coordinate';
  });
  data.pairs = findPairs(data.visits, config);
  // Historical source episodes are generated BEFORE outcomes, independently of future labels.
  data.sourceEpisodes = [];
  data.patients.forEach((p) =>
    DISEASES.forEach((disease) => {
      if (random() < 0.3) {
        const onset = start + integer(0, 20) * DAY;
        data.sourceEpisodes.push({
          episode_id: `SRC${data.sourceEpisodes.length + 1}`,
          patient_id: p.patient_id,
          disease,
          reported_at: new Date(onset).toISOString(),
          infectious_start: new Date(onset).toISOString(),
          infectious_end: new Date(onset + 7 * DAY).toISOString(),
          status: 'synthetic_reported_infectious',
          source: 'fictional_7_day_window_not_medical_estimate',
          is_synthetic: true,
        });
      }
    }),
  );
  const episodeMap = new Map(
    data.sourceEpisodes.map((e) => [`${e.patient_id}:${e.disease}`, e]),
  );
  const patientMap = new Map(data.patients.map((p) => [p.patient_id, p]));
  const aggregate = new Map(
    data.patients.map((p) => [
      p.patient_id,
      {
        nearby: new Set(),
        pairMinutes: 0,
        bleMinutes: 0,
        disease: Object.fromEntries(
          DISEASES.map((d) => [d, { minutes: 0, score: 0 }]),
        ),
      },
    ]),
  );
  data.encounters = [];
  data.pairDiseaseExposure = [];
  for (const pair of data.pairs) {
    // Toy BLE availability; a nearby coordinate pair does not guarantee an observed BLE signal.
    const ble = pair.distance_m <= 12 && random() < 0.7;
    const bleDuration = ble
      ? rounded(pair.overlap_minutes * (0.4 + random() * 0.6))
      : 0;
    const sameIndoorSpace = random() < 0.5,
      sharedFood = random() < 0.15,
      handSurfaceContact = random() < 0.2;
    pair.ble_detected = +ble;
    pair.same_indoor_space = +sameIndoorSpace;
    pair.shared_food_contact = +sharedFood;
    pair.hand_surface_contact = +handSurfaceContact;
    pair.context_source = 'independently_simulated_not_inferred_from_gps';
    if (ble)
      data.encounters.push({
        encounter_id: `BLE${data.encounters.length + 1}`,
        pair_id: pair.pair_id,
        user_a: pair.user_a,
        user_b: pair.user_b,
        timestamp: pair.overlap_start,
        duration_minutes: bleDuration,
        median_rssi_dbm: integer(-85, -40),
        is_synthetic: true,
      });
    for (const [source, target] of [
      [pair.user_a, pair.user_b],
      [pair.user_b, pair.user_a],
    ]) {
      const agg = aggregate.get(target),
        patient = patientMap.get(target);
      agg.nearby.add(source);
      agg.pairMinutes += pair.overlap_minutes;
      agg.bleMinutes += bleDuration;
      DISEASES.forEach((disease, j) => {
        const episode = episodeMap.get(`${source}:${disease}`);
        const minutes = infectiousMinutes(pair, episode);
        const context =
          j === 5
            ? +sharedFood
            : j === 4
              ? +handSurfaceContact
              : sameIndoorSpace
                ? 1
                : 0.15;
        const immunity =
          j === 0
            ? patient.influenza_vaccine_recent
            : j === 1
              ? patient.varicella_immune_history
              : j === 2 || j === 3
                ? patient.mmr_doses / 2
                : 0;
        // Arbitrary dimensionless index: NOT a chance of infection or a clinical distance threshold.
        const score =
          (minutes / 60) *
          Math.exp(-pair.distance_m / 20) *
          context *
          (1 - 0.6 * immunity);
        agg.disease[disease].minutes += minutes;
        agg.disease[disease].score += score;
        data.pairDiseaseExposure.push({
          pair_id: pair.pair_id,
          source_user: source,
          target_user: target,
          disease,
          source_status_during_overlap:
            minutes > 0
              ? 'synthetic_reported_infectious'
              : 'no_known_active_episode_not_proof_uninfected',
          source_episode_id: minutes > 0 ? episode.episode_id : '',
          infectious_overlap_minutes: rounded(minutes),
          transmission_context_present: +(context > 0),
          synthetic_exposure_index: rounded(score),
          score_kind: 'uncalibrated_index_not_probability',
          is_synthetic: true,
        });
      });
    }
  }
  data.outcomes = [];
  data.features.forEach((row) => {
    const agg = aggregate.get(row.patient_id);
    const last = data.visits
      .filter((v) => v.patient_id === row.patient_id)
      .sort((a, b) => Date.parse(b.visit_start) - Date.parse(a.visit_start))[0];
    row.last_latitude = last.latitude;
    row.last_longitude = last.longitude;
    row.last_location_at = last.visit_start;
    row.proximity_unique_users_28d = agg.nearby.size;
    row.proximity_pair_hours_28d = rounded(agg.pairMinutes / 60);
    row.ble_encounter_hours_28d = rounded(agg.bleMinutes / 60);
    DISEASES.forEach((disease, j) => {
      row[`${disease}_infectious_contact_hours`] = rounded(
        agg.disease[disease].minutes / 60,
      );
      row[`${disease}_contact_exposure_index`] = rounded(
        agg.disease[disease].score,
      );
      const immunity =
        j === 0
          ? row.influenza_vaccine_recent
          : j === 1
            ? row.varicella_immune_history
            : j === 2 || j === 3
              ? row.mmr_doses / 2
              : 0;
      const logit =
        -2.5 +
        row[`${disease}_area_exposure`] / 12 +
        Math.log1p(agg.disease[disease].score) +
        0.3 * row.immunocompromised -
        1.2 * immunity +
        (random() - 0.5);
      const outcome = +(random() < 1 / (1 + Math.exp(-logit)));
      row[`outcome_${disease}`] = outcome;
      data.outcomes.push({
        patient_id: row.patient_id,
        disease,
        prediction_at: row.prediction_at,
        followup_end: new Date(cutoff + 28 * DAY).toISOString(),
        simulated_outcome: outcome,
        outcome_recorded_at: outcome
          ? new Date(cutoff + integer(1, 28) * DAY).toISOString()
          : '',
        followup_complete: true,
        label_source:
          'bernoulli_contact_and_area_simulation_not_diagnosis_or_verified_transmission',
        is_synthetic: true,
      });
    });
  });
  data.proximityConfig = config;
  return data;
}
module.exports = {
  addProximity,
  haversineMeters,
  compareVisits,
  findPairs,
  infectiousMinutes,
  DEFAULT_CONFIG,
};
