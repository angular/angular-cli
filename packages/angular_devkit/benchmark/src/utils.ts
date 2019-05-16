/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { AggregatedMetric, Metric, MetricGroup } from './interfaces';

// Prefers to keep v1 when both are equal.
export const max = (v1: number, v2: number) => v2 > v1 ? v2 : v1;

export const cumulativeMovingAverage = (acc: number, val: number, accSize: number) =>
  (val + accSize * acc) / (accSize + 1);

export const aggregateMetrics = (
  m1: Metric | AggregatedMetric,
  m2: Metric | AggregatedMetric,
): AggregatedMetric => {
  if ((m1.name != m2.name) || (m1.unit != m2.unit)) {
    throw new Error('Cannot aggregate metrics with different names or units:');
  }

  const m1Values = m1.componentValues ? m1.componentValues : [m1.value];
  const m2Values = m2.componentValues ? m2.componentValues : [m2.value];

  return {
    name: m1.name,
    unit: m1.unit,
    // m1.value already holds an average if it has component values.
    value: m2Values.reduce(
      (acc, val, idx) => cumulativeMovingAverage(acc, val, idx + m1Values.length),
      m1.value,
    ),
    componentValues: [...m1Values, ...m2Values],
  };
};

export const aggregateMetricGroups = (g1: MetricGroup, g2: MetricGroup): MetricGroup => {
  if (g1.name != g2.name || g1.metrics.length != g2.metrics.length) {
    throw new Error('Cannot aggregate metric groups with different names.');
  }

  return {
    name: g1.name,
    metrics: g1.metrics.map((_, idx) => aggregateMetrics(g1.metrics[idx], g2.metrics[idx])),
  };
};
