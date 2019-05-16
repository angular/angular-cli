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
  /** Number of processes */
  processes: number;
  /** Percentage (from 0 to 100 * vcore) */
  cpu: number;
  /** Bytes */
  memory: number;
  /** Parent Process ID */
  ppid: number;
  /** Process ID */
  pid: number;
  /** Ms user + system time */
  ctime: number;
  /** Ms since the start of the process */
  elapsed: number;
  /** Ms since epoch */
  timestamp: number;
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
