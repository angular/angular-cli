/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, logging } from '@angular-devkit/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { concatMap, map, retryWhen, take, tap, throwIfEmpty } from 'rxjs/operators';
import { Command } from './command';
import { BenchmarkReporter, Capture, MetricGroup } from './interfaces';
import { LocalMonitoredProcess } from './monitored-process';
import { aggregateMetricGroups } from './utils';

export interface RunBenchmarkOptions {
  command: Command;
  captures: Capture[];
  reporters: BenchmarkReporter[];
  iterations?: number;
  retries?: number;
  expectedExitCode?: number;
  logger?: logging.Logger;
}

export class MaximumRetriesExceeded extends BaseException {
  constructor(retries: number) {
    super(`Maximum number of retries (${retries}) for command was exceeded.`);
  }
}

export function runBenchmark({
  command, captures, reporters = [], iterations = 5, retries = 5, logger = new logging.NullLogger(),
}: RunBenchmarkOptions): Observable<MetricGroup[]> {

  let successfulRuns = 0;
  let failedRuns = 0;
  const notDoneYet = new BaseException('Not done yet.');
  const processFailed = new BaseException('Wrong exit code.');
  const debugPrefix = () => `Run #${successfulRuns + 1}:`;
  let aggregatedMetricGroups: MetricGroup[] = [];

  // Run the process and captures, wait for both to finish, and average out the metrics.
  return new Observable(obs => {
    const monitoredProcess = new LocalMonitoredProcess(command);
    const metric$ = captures.map(capture => capture(monitoredProcess));
    obs.next([monitoredProcess, ...metric$]);
  }).pipe(
    tap(() => logger.debug(`${debugPrefix()} starting`)),
    concatMap(([monitoredProcess, ...metric$]) => forkJoin(monitoredProcess.run(), ...metric$)),
    throwIfEmpty(() => new Error('Nothing was captured')),
    concatMap((results) => {
      const [processExitCode, ...metrics] = results;

      if ((processExitCode as number) != command.expectedExitCode) {
        logger.debug(`${debugPrefix()} exited with ${processExitCode} but `
          + `${command.expectedExitCode} was expected`);

        return throwError(processFailed);
      }

      logger.debug(`${debugPrefix()} finished successfully`);

      return of(metrics as MetricGroup[]);
    }),
    map(newMetricGroups => {
      // Aggregate metric groups into a single one.
      if (aggregatedMetricGroups.length === 0) {
        aggregatedMetricGroups = newMetricGroups;
      } else {
        aggregatedMetricGroups = aggregatedMetricGroups.map((_, idx) =>
          aggregateMetricGroups(aggregatedMetricGroups[idx], newMetricGroups[idx]),
        );
      }

      successfulRuns += 1;

      return aggregatedMetricGroups;
    }),
    concatMap(val => successfulRuns < iterations ? throwError(notDoneYet) : of(val)),
    // This is where we control when the process should be run again.
    retryWhen(errors => errors.pipe(concatMap(val => {
      // Always run again while we are not done yet.
      if (val === notDoneYet) { return of(val); }

      // Otherwise check if we're still within the retry threshold.
      failedRuns += 1;
      if (failedRuns < retries) { return of(val); }

      if (val === processFailed) { return throwError(new MaximumRetriesExceeded(retries)); }

      // Not really sure what happened here, just re-throw it.
      return throwError(val);
    }))),
    tap(groups => reporters.forEach(reporter => reporter(command, groups))),
    take(1),
  );
}
