/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, logging } from '@angular-devkit/core';
import { spawnSync } from 'child_process';
import { Observable, combineLatest, forkJoin, of, throwError } from 'rxjs';
import {
  concatMap,
  filter,
  first,
  reduce,
  repeat,
  retryWhen,
  startWith,
  take,
  takeUntil,
  tap,
  throwIfEmpty,
  timeout,
} from 'rxjs/operators';
import { Command } from './command';
import { MetricGroup } from './interfaces';
import { LocalMonitoredProcess } from './monitored-process';
import { MaximumRetriesExceeded, RunBenchmarkOptions } from './run-benchmark';
import { aggregateMetricGroups } from './utils';

export interface RunBenchmarkWatchOptions extends RunBenchmarkOptions {
  watchMatcher: string;
  watchTimeout?: number;
  watchCommand: Command;
}

export function runBenchmarkWatch({
  command, captures, reporters = [], iterations = 5, retries = 5, logger = new logging.NullLogger(),
  watchMatcher, watchTimeout = 10000, watchCommand,
}: RunBenchmarkWatchOptions): Observable<MetricGroup[]> {

  let successfulRuns = 0;
  let failedRuns = 0;
  const debugPrefix = () => `Run #${successfulRuns + 1}:`;

  // Run the process and captures, wait for both to finish, and average out the metrics.
  const monitoredProcess = new LocalMonitoredProcess(command, false);
  const processFailed = new BaseException('Wrong exit code.');

  // Gather stats until the stdout contains the matched text.
  const stats$ = monitoredProcess.stats$.pipe(
    takeUntil(monitoredProcess.stdout$.pipe(
      first(stdout => stdout.toString().includes(watchMatcher)),
      timeout(watchTimeout),
    )),
  );

  return combineLatest([
    monitoredProcess.run().pipe(
      startWith(undefined),
      tap(processExitCode => {
        if (processExitCode !== undefined && processExitCode != command.expectedExitCode) {
          logger.debug(`${debugPrefix()} exited with ${processExitCode} but `
            + `${command.expectedExitCode} was expected`);

          throw processFailed;
        }
      }),
    ),
    monitoredProcess.stdout$.pipe(
      filter(stdout => stdout.toString().includes(watchMatcher)),
      take(1),
    ),
  ]).pipe(
    timeout(watchTimeout),
    concatMap(() => {
      const { cmd, cwd, args } = watchCommand;
      failedRuns = 0;

      return of(null)
        .pipe(
          tap(() => {
            const { status, error } = spawnSync(cmd, args, { cwd });
            monitoredProcess.resetElapsedTimer();

            if (status != command.expectedExitCode) {
              logger.debug(`${debugPrefix()} exited with ${status}\n${error?.message}`);
              throw processFailed;
            }

            // Reset fail counter for this iteration.
            failedRuns = 0;
          }),
          tap(() => logger.debug(`${debugPrefix()} starting`)),
          concatMap(() => forkJoin(captures.map(capture => capture(stats$)))),
          throwIfEmpty(() => new Error('Nothing was captured')),
          tap(() => logger.debug(`${debugPrefix()} finished successfully`)),
          tap(() => successfulRuns++),
          repeat(iterations),
          retryWhen(errors => errors
            .pipe(concatMap(val => {
              // Check if we're still within the retry threshold.
              failedRuns++;

              return failedRuns < retries ? of(val) : throwError(val);
            })),
          ),
        );
    }),
    retryWhen(errors => errors
      .pipe(concatMap(val => {
        // Check if we're still within the retry threshold.
        failedRuns++;

        if (failedRuns < retries) {
          return of(val);
        }

        return throwError(
          val === processFailed ?
            new MaximumRetriesExceeded(retries) :
            val,
        );
      })),
    ),
    take(iterations),
    reduce((acc, val) => acc.map((_, idx) => aggregateMetricGroups(acc[idx], val[idx]))),
    tap(groups => reporters.forEach(reporter => reporter(command, groups))),
  );
}
