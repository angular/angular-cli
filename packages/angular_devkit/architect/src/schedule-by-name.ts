/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json, logging } from '@angular-devkit/core';
import { EMPTY, Subscription } from 'rxjs';
import { catchError, first, ignoreElements, map, shareReplay } from 'rxjs/operators';
import {
  BuilderInfo,
  BuilderInput,
  BuilderOutput,
  BuilderProgressReport,
  BuilderRun,
  Target,
  targetStringFromTarget,
} from './api';
import { JobOutboundMessageKind, JobState, Scheduler } from './jobs';

const progressSchema = require('./progress-schema.json');

let _uniqueId = 0;

export async function scheduleByName(
  name: string,
  buildOptions: json.JsonObject,
  options: {
    target?: Target;
    scheduler: Scheduler;
    logger: logging.LoggerApi;
    workspaceRoot: string | Promise<string>;
    currentDirectory: string | Promise<string>;
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
  if (job.state !== JobState.Started) {
    stateSubscription = job.outboundBus.subscribe(
      (event) => {
        if (event.kind === JobOutboundMessageKind.Start) {
          job.input.next(message);
        }
      },
      () => {},
    );
  } else {
    job.input.next(message);
  }

  const logChannelSub = job.getChannel<logging.LogEntry>('log').subscribe(
    (entry) => {
      logger.next(entry);
    },
    () => {},
  );

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
    map(
      (output) =>
        ({
          ...output,
          ...(options.target ? { target: options.target } : 0),
          info,
        } as unknown as BuilderOutput),
    ),
    shareReplay(),
  );

  // Start the builder.
  output.pipe(first()).subscribe({
    error() {},
  });

  return {
    id,
    info,
    // This is a getter so that it always returns the next output, and not the same one.
    get result() {
      return output.pipe(first()).toPromise();
    },
    output,
    progress: job
      .getChannel<BuilderProgressReport>('progress', progressSchema)
      .pipe(shareReplay(1)),
    stop() {
      job.stop();

      return job.outboundBus
        .pipe(
          ignoreElements(),
          catchError(() => EMPTY),
        )
        .toPromise();
    },
  };
}

export async function scheduleByTarget(
  target: Target,
  overrides: json.JsonObject,
  options: {
    scheduler: Scheduler;
    logger: logging.LoggerApi;
    workspaceRoot: string | Promise<string>;
    currentDirectory: string | Promise<string>;
  },
): Promise<BuilderRun> {
  return scheduleByName(`{${targetStringFromTarget(target)}}`, overrides, {
    ...options,
    target,
    logger: options.logger,
  });
}
