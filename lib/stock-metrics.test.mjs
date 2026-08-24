import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAverage,
  calculateMaxDrawdown,
  calculateMovingAverage,
} from "./stock-metrics.ts";

test("moving average starts only after a complete window", () => {
  assert.deepEqual(calculateMovingAverage([1, 2, 3, 4], 3), [
    null,
    null,
    2,
    3,
  ]);
});

test("maximum drawdown follows a preceding peak", () => {
  assert.equal(calculateMaxDrawdown([100, 120, 90, 95]), -0.25);
});

test("maximum drawdown is zero without a decline", () => {
  assert.equal(calculateMaxDrawdown([1, 2, 3]), 0);
  assert.equal(calculateMaxDrawdown([5, 5, 5]), 0);
});

test("average returns the arithmetic mean", () => {
  assert.equal(calculateAverage([10, 20, 30]), 20);
});
