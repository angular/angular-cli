/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Observable } from 'rxjs';
import { map, reduce } from 'rxjs/operators';
import { AggregatedProcessStats, Capture, MetricGroup, MonitoredProcess } from './interfaces';
import { cumulativeMovingAverage, max } from './utils';


export const defaultStatsCapture: Capture = (
  process: MonitoredProcess,
): Observable<MetricGroup> => {
  type Accumulator = {
    elapsed: number,
    avgProcesses: number,
    peakProcesses: number,
    avgCpu: number,
    peakCpu: number,
    avgMemory: number,
    peakMemory: number,
  };
  const seed: Accumulator = {
    elapsed: 0,
    avgProcesses: 0,
    peakProcesses: 0,
    avgCpu: 0,
    peakCpu: 0,
    avgMemory: 0,
    peakMemory: 0,
  };

  return process.stats$.pipe(
    reduce<AggregatedProcessStats, Accumulator>((acc, val, idx) => ({
      elapsed: val.elapsed,
      avgProcesses: cumulativeMovingAverage(acc.avgProcesses, val.processes, idx),
      peakProcesses: max(acc.peakProcesses, val.processes),
      avgCpu: cumulativeMovingAverage(acc.avgCpu, val.cpu, idx),
      peakCpu: max(acc.peakCpu, val.cpu),
      avgMemory: cumulativeMovingAverage(acc.avgMemory, val.memory, idx),
      peakMemory: max(acc.peakMemory, val.memory),
    }), seed),
    map(metrics => ({
      name: 'Process Stats',
      metrics: [
        { name: 'Elapsed Time', unit: 'ms', value: metrics.elapsed },
        { name: 'Average Process usage', unit: 'process(es)', value: metrics.avgProcesses },
        { name: 'Peak Process usage', unit: 'process(es)', value: metrics.peakProcesses },
        { name: 'Average CPU usage', unit: '%', value: metrics.avgCpu },
        { name: 'Peak CPU usage', unit: '%', value: metrics.peakCpu },
        { name: 'Average Memory usage', unit: 'MB', value: metrics.avgMemory * 1e-6 },
        { name: 'Peak Memory usage', unit: 'MB', value: metrics.peakMemory * 1e-6 },
      ],
    })),
  );
};
