/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { Command } from './command';

export interface AggregatedProcessStats {
  processes: number;      // number of processes
  cpu: number;            // percentage (from 0 to 100*vcore)
  memory: number;         // bytes
  ppid: number;           // PPID
  pid: number;            // PID
  ctime: number;          // ms user + system time
  elapsed: number;        // ms since the start of the process
  timestamp: number;      // ms since epoch
}

export interface MonitoredProcess {
  stats$: Observable<AggregatedProcessStats>;
  stdout$: Observable<Buffer>;
  stderr$: Observable<Buffer>;
  run(): Observable<number>;
  toString(): string;
}

export interface Metric {
  name: string;
  unit: string;
  value: number;
  componentValues?: number[];
}

export interface AggregatedMetric extends Metric {
  componentValues: number[];
}

export interface MetricGroup {
  name: string;
  metrics: (Metric | AggregatedMetric)[];
}

export type Capture = (process: MonitoredProcess) => Observable<MetricGroup>;

// TODO: might need to allow reporters to say they are finished.
export type BenchmarkReporter = (command: Command, groups: MetricGroup[]) => void;
