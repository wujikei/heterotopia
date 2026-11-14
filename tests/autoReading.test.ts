import assert from 'node:assert/strict';
import test from 'node:test';
import { autoDelayFor } from '../src/autoReading';

test('automatic reading gives short sentences a pause and longer lines time to breathe', () => {
  assert.equal(autoDelayFor('咚。咚。', 4), 1820);
  assert.equal(autoDelayFor('字'.repeat(60), 4), 4900);
  assert.equal(autoDelayFor('字'.repeat(300), 4), 9000);
  assert.ok(autoDelayFor('一页未尽。', 2) < autoDelayFor('一页未尽。', 10));
});

test('pace remains compatible with old settings, whitespace and non-BMP characters', () => {
  assert.equal(autoDelayFor('  咚。咚。\n', 4), autoDelayFor('咚。咚。', 4));
  assert.equal(autoDelayFor('𠮷', 4), 1655);
  assert.equal(autoDelayFor('短句', NaN), autoDelayFor('短句', 4));
  assert.equal(autoDelayFor('短句', -10), autoDelayFor('短句', 2));
  assert.equal(autoDelayFor('短句', 100), autoDelayFor('短句', 10));
});
