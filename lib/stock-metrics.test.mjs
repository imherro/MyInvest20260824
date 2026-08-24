import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAverage,
  calculateLatestToPreviousAverage,
  calculateMaxDrawdown,
  calculateMovingAverage,
  calculatePeriodReturn,
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

test("period return uses the close exactly N trading days ago", () => {
  assert.ok(
    Math.abs(calculatePeriodReturn([100, 101, 102, 103, 104, 110], 5) - 0.1) <
      Number.EPSILON,
  );
});

test("period return is unavailable without a complete interval", () => {
  assert.equal(calculatePeriodReturn([100, 101, 102, 103, 104], 5), null);
});

test("latest turnover can be compared with the previous full window", () => {
  assert.equal(
    calculateLatestToPreviousAverage([...Array(20).fill(100), 200], 20),
    2,
  );
});

test("latest-to-previous average is unavailable without 21 values", () => {
  assert.equal(calculateLatestToPreviousAverage(Array(20).fill(100), 20), null);
});

test("latest-to-previous average avoids a zero baseline", () => {
  assert.equal(
    calculateLatestToPreviousAverage([...Array(20).fill(0), 100], 20),
    null,
  );
});
