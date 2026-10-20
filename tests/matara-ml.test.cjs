const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  generate,
  fit,
  predict,
  metrics,
  evaluate,
  validate,
} = require('../scripts/matara-ml.cjs');

test('synthetic experiment has 100 disjoint users, pre-cutoff features and reproducible outcomes', () => {
  const data = generate();
  assert.deepEqual(data, generate());
  const result = evaluate(data);
  validate(data, result);
  assert.equal(result.predictions.length, 180);
  assert.ok(
    Object.values(result.scores).every(
      (s) =>
        s.logistic_regression.positives > 0 &&
        s.logistic_regression.negatives > 0,
    ),
  );
});

test('classifier scales only training values and separates a simple binary example', () => {
  const model = fit([[-3], [-2], [2], [3]], [0, 0, 1, 1]);
  assert.equal(model.means[0], 0);
  const before = JSON.stringify(model);
  assert.ok(predict(model, [-2]) < 0.5);
  assert.ok(predict(model, [2]) > 0.5);
  predict(model, [1000]);
  assert.equal(JSON.stringify(model), before);
});

test('majority accuracy does not disguise zero positive recall', () => {
  const result = metrics([0, 0, 0, 1], [0, 0, 0, 0]);
  assert.equal(result.accuracy, 0.75);
  assert.equal(result.recall, 0);
  assert.equal(result.balanced_accuracy, 0.5);
  assert.equal(result.f1, 0);
});
