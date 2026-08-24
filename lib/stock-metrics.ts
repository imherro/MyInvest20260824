export function calculateMovingAverage(
  values: readonly number[],
  window: number,
): (number | null)[] {
  let sum = 0;

  return values.map((value, index) => {
    sum += value;
    if (index >= window) sum -= values[index - window];
    return index >= window - 1 ? sum / window : null;
  });
}

export function calculateMaxDrawdown(values: readonly number[]): number {
  let peak = values[0];
  let maxDrawdown = 0;

  for (const value of values) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value / peak - 1);
  }

  return maxDrawdown;
}

export function calculateAverage(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculatePeriodReturn(
  values: readonly number[],
  periods: number,
): number | null {
  if (values.length <= periods) return null;

  return values.at(-1)! / values[values.length - periods - 1] - 1;
}

export function calculateLatestToPreviousAverage(
  values: readonly number[],
  window: number,
): number | null {
  if (values.length <= window) return null;

  const previous = values.slice(-window - 1, -1);
  const average = calculateAverage(previous);
  if (average === 0) return null;

  return values.at(-1)! / average;
}

export function calculateRangePosition(
  values: readonly number[],
  window: number,
): number | null {
  if (values.length < window) return null;

  const recent = values.slice(-window);
  const minimum = Math.min(...recent);
  const maximum = Math.max(...recent);
  if (maximum === minimum) return null;

  return (recent.at(-1)! - minimum) / (maximum - minimum);
}
