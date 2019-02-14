/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { experimental, json, logging } from '@angular-devkit/core';
import { Subscription } from 'rxjs';
import { first, ignoreElements, map, shareReplay } from 'rxjs/operators';
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
    currentDirectory: workspaceRoot,
    workspaceRoot: currentDirectory,
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
    });
  } else {
    job.input.next(message);
  }

  const logChannelSub = job.getChannel<logging.LogEntry>('log').subscribe(entry => {
    logger.next(entry);
  });

  const s = job.outboundBus.subscribe(
    undefined,
    undefined,
    () => {
      s.unsubscribe();
      logChannelSub.unsubscribe();
      if (stateSubscription) {
        stateSubscription.unsubscribe();
      }
    },
  );
  const output = job.output.pipe(
    map(output => ({
      ...output,
      ...options.target ? { target: options.target } : 0,
      info,
    } as BuilderOutput)),
  );

  return {
    id,
    info,
    result: output.pipe(first()).toPromise(),
    output,
    progress: job.getChannel<BuilderProgressReport>('progress', progressSchema).pipe(
      shareReplay(1),
    ),
    stop() {
      job.stop();

      return output.pipe(ignoreElements()).toPromise();
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
  },
): Promise<BuilderRun> {
  return scheduleByName(`{${targetStringFromTarget(target)}}`, overrides, {
    ...options,
    target,
    logger: options.logger,
  });
}
