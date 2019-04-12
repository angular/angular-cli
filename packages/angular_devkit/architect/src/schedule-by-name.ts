/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { analytics, experimental, json, logging } from '@angular-devkit/core';
import { EMPTY, Subscription } from 'rxjs';
import { catchError, first, ignoreElements, map, share, shareReplay, tap } from 'rxjs/operators';
import {
  BuilderInfo,
  BuilderInput,
  BuilderOutput, BuilderProgressReport,
  BuilderRun,
  Target,
  targetStringFromTarget,
} from './api';

const progressSchema = require('./progress-schema.json');


let _uniqueId = 0;

export async function scheduleByName(
  name: string,
  buildOptions: json.JsonObject,
  options: {
    target?: Target,
    scheduler: experimental.jobs.Scheduler,
    logger: logging.LoggerApi,
    workspaceRoot: string | Promise<string>,
    currentDirectory: string | Promise<string>,
    analytics?: analytics.Analytics,
  },
): Promise<BuilderRun> {
  const childLoggerName = options.target ? `{${targetStringFromTarget(options.target)}}` : name;
  const logger = options.logger.createChild(childLoggerName);
  const job = options.scheduler.schedule<{}, BuilderInput, BuilderOutput>(name, {});
  let stateSubscription: Subscription;

  const workspaceRoot = await options.workspaceRoot;
  const currentDirectory = await options.currentDirectory;

  const description = await job.description.toPromise();
  const info = description.info as BuilderInfo;
  const id = ++_uniqueId;

  const message = {
    id,
    currentDirectory,
    workspaceRoot,
    info: info,
    options: buildOptions,
    ...(options.target ? { target: options.target } : {}),
  };

  // Wait for the job to be ready.
  if (job.state !== experimental.jobs.JobState.Started) {
    stateSubscription = job.outboundBus.subscribe(event => {
      if (event.kind === experimental.jobs.JobOutboundMessageKind.Start) {
        job.input.next(message);
      }
    }, () => {});
  } else {
    job.input.next(message);
  }

  const logChannelSub = job.getChannel<logging.LogEntry>('log').subscribe(entry => {
    logger.next(entry);
  }, () => {});

  const s = job.outboundBus.subscribe({
    error() {},
    complete() {
      s.unsubscribe();
      logChannelSub.unsubscribe();
      if (stateSubscription) {
        stateSubscription.unsubscribe();
      }
    },
  });
  const output = job.output.pipe(
    map(output => ({
      ...output,
      ...options.target ? { target: options.target } : 0,
      info,
    } as BuilderOutput)),
    shareReplay(),
  );

  // If there's an analytics object, take the job channel and report it to the analytics.
  if (options.analytics) {
    const reporter = new analytics.AnalyticsReporter(options.analytics);
    job.getChannel<analytics.AnalyticsReport>('analytics')
      .subscribe(report => reporter.report(report));
  }
  // Start the builder.
  output.pipe(first()).subscribe({
    error() {},
  });

  return {
    id,
    info,
    // This is a getter so that it always returns the next output, and not the same one.
    get result() { return output.pipe(first()).toPromise(); },
    output,
    progress: job.getChannel<BuilderProgressReport>('progress', progressSchema).pipe(
      shareReplay(1),
    ),
    stop() {
      job.stop();

      return job.outboundBus.pipe(
        ignoreElements(),
        catchError(() => EMPTY),
      ).toPromise();
    },
  };
}

export async function scheduleByTarget(
  target: Target,
  overrides: json.JsonObject,
  options: {
    scheduler: experimental.jobs.Scheduler,
    logger: logging.LoggerApi,
    workspaceRoot: string | Promise<string>,
    currentDirectory: string | Promise<string>,
    analytics?: analytics.Analytics,
  },
): Promise<BuilderRun> {
  return scheduleByName(`{${targetStringFromTarget(target)}}`, overrides, {
    ...options,
    target,
    logger: options.logger,
  });
}
