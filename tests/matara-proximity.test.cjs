const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  haversineMeters,
  compareVisits,
  findPairs,
  infectiousMinutes,
} = require('../scripts/matara-proximity.cjs');
const { generate } = require('../scripts/matara-ml.cjs');

function visit(id, overrides = {}) {
  return {
    patient_id: id,
    visit_id: `V${id}`,
    latitude: 6,
    longitude: 80.5,
    gps_accuracy_m: 5,
    visit_start: '2026-08-01T10:00:00Z',
    visit_end: '2026-08-01T11:00:00Z',
    ...overrides,
  };
}

test('Haversine measures metres and handles symmetry and invalid coordinates', () => {
  assert.equal(haversineMeters(6, 80, 6, 80), 0);
  assert.ok(Math.abs(haversineMeters(0, 0, 0, 1) - 111194.927) < 0.01);
  assert.equal(haversineMeters(6, 80, 7, 81), haversineMeters(7, 81, 6, 80));
  assert.throws(() => haversineMeters(100, 80, 6, 80));
});

test('nearby coordinates do not match different times or the same user', () => {
  assert.equal(compareVisits(visit('A'), visit('A')), null);
  assert.equal(
    compareVisits(
      visit('A'),
      visit('B', {
        visit_start: '2026-08-01T11:00:00Z',
        visit_end: '2026-08-01T12:00:00Z',
      }),
    ),
    null,
  );
  assert.equal(compareVisits(visit('A'), visit('B', { longitude: 81 })), null);
  assert.equal(
    compareVisits(
      visit('A'),
      visit('B', {
        visit_start: '2026-08-01T10:56:00Z',
      }),
    ),
    null,
  );
});

test('overlap boundary, configurable radius and GPS uncertainty are retained', () => {
  const a = visit('A');
  const b = visit('B', {
    latitude: 6.0003,
    visit_start: '2026-08-01T10:55:00Z',
    gps_accuracy_m: 25,
  });
  const pair = compareVisits(a, b);
  assert.equal(pair.overlap_minutes, 5);
  assert.equal(pair.gps_range_assessment, 'uncertain_at_radius_boundary');
  assert.equal(
    compareVisits(a, b, { radius_m: 20, min_overlap_minutes: 5 }),
    null,
  );
  assert.equal(findPairs([a, b]).length, 1);
  assert.throws(() =>
    compareVisits(a, b, { radius_m: -1, min_overlap_minutes: 5 }),
  );
});

test('temporal search finds contacts across area names and does not duplicate pairs', () => {
  const a = visit('A', { area_name: 'A' });
  const b = visit('B', { area_name: 'B' });
  const c = visit('C', {
    visit_start: '2026-08-01T12:00:00Z',
    visit_end: '2026-08-01T13:00:00Z',
  });
  assert.equal(findPairs([c, b, a]).length, 1);
  assert.equal(
    findPairs([a, b], { radius_m: 50, min_overlap_minutes: 61 }).length,
    0,
  );
});

test('source infectious window is clipped and future reports cannot leak', () => {
  const pair = compareVisits(visit('A'), visit('B'));
  const episode = {
    reported_at: '2026-08-01T09:00:00Z',
    infectious_start: '2026-08-01T10:30:00Z',
    infectious_end: '2026-08-01T12:00:00Z',
  };
  assert.equal(infectiousMinutes(pair, episode), 30);
  assert.equal(
    infectiousMinutes(pair, {
      ...episode,
      reported_at: '2026-08-02T00:00:00Z',
    }),
    0,
  );
  assert.equal(infectiousMinutes(pair, undefined), 0);
});

test('generated contacts reference actual users and historical source episodes', () => {
  const data = generate();
  const ids = new Set(data.patients.map((p) => p.patient_id));
  const pairs = new Map(data.pairs.map((p) => [p.pair_id, p]));
  const episodes = new Map(data.sourceEpisodes.map((e) => [e.episode_id, e]));
  assert.equal(data.visits.length, 2800);
  assert.ok(
    data.visits.every(
      (v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude),
    ),
  );
  assert.ok(data.pairs.length > 0);
  assert.ok(
    data.pairs.every(
      (p) =>
        ids.has(p.user_a) &&
        ids.has(p.user_b) &&
        p.user_a !== p.user_b &&
        p.distance_m <= p.radius_m &&
        p.overlap_minutes >= p.min_overlap_minutes,
    ),
  );
  assert.equal(data.pairDiseaseExposure.length, data.pairs.length * 12);
  assert.ok(
    data.encounters.every(
      (e) => pairs.has(e.pair_id) && ids.has(e.user_a) && ids.has(e.user_b),
    ),
  );
  for (const row of data.pairDiseaseExposure) {
    if (row.synthetic_exposure_index > 0) {
      const episode = episodes.get(row.source_episode_id);
      assert.ok(episode);
      assert.equal(episode.patient_id, row.source_user);
      assert.equal(episode.disease, row.disease);
      assert.ok(
        Date.parse(episode.reported_at) <=
          Date.parse(pairs.get(row.pair_id).overlap_start),
      );
      assert.ok(row.infectious_overlap_minutes > 0);
    }
  }
});
