/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging, tags } from '@angular-devkit/core';
import { AggregatedMetric, BenchmarkReporter, Metric } from './interfaces';

export const defaultReporter = (logger: logging.Logger): BenchmarkReporter => (process, groups) => {
  const toplevelLogger = logger;
  const indentLogger = new logging.IndentLogger('benchmark-indent-logger', toplevelLogger);

  const formatMetric = (metric: Metric | AggregatedMetric) => tags.oneLine`
    ${metric.name}: ${metric.value.toFixed(2)} ${metric.unit}
    ${metric.componentValues ? `(${metric.componentValues.map(v => v.toFixed(2)).join(', ')})` : ''}
  `;

  groups.forEach(group => {
    toplevelLogger.info(`${group.name}`);
    group.metrics.forEach(metric => indentLogger.info(formatMetric(metric)));
  });
};
