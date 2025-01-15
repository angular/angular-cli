/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { json, logging } from '@angular-devkit/core';
import {
  Observable,
  Subscription,
  defaultIfEmpty,
  firstValueFrom,
  from,
  isObservable,
  mergeMap,
  of,
  tap,
  throwError,
} from 'rxjs';
import {
  BuilderContext,
  BuilderHandlerFn,
  BuilderInfo,
  BuilderInput,
  BuilderOutput,
  BuilderProgressState,
  ScheduleOptions,
  Target,
  TypedBuilderProgress,
  fromAsyncIterable,
  isBuilderOutput,
  targetStringFromTarget,
} from './api';
import { Builder, BuilderSymbol, BuilderVersionSymbol } from './internal';
import { JobInboundMessageKind, createJobHandler } from './jobs';
import { scheduleByName, scheduleByTarget } from './schedule-by-name';

export type { Builder };

// eslint-disable-next-line max-lines-per-function
export function createBuilder<OptT = json.JsonObject, OutT extends BuilderOutput = BuilderOutput>(
  fn: BuilderHandlerFn<OptT>,
): Builder<OptT & json.JsonObject> {
  const cjh = createJobHandler;
  // eslint-disable-next-line max-lines-per-function
  const handler = cjh<json.JsonObject, BuilderInput, OutT>((options, context) => {
    const scheduler = context.scheduler;
    const progressChannel = context.createChannel('progress');
    const logChannel = context.createChannel('log');
    const addTeardown = context.addTeardown.bind(context);
    let currentState: BuilderProgressState = BuilderProgressState.Stopped;
    let current = 0;
    let status = '';
    let total = 1;

    function log(entry: logging.LogEntry) {
      logChannel.next(entry);
    }
    function progress(progress: TypedBuilderProgress, context: BuilderContext) {
      currentState = progress.state;
      if (progress.state === BuilderProgressState.Running) {
        current = progress.current;
        total = progress.total !== undefined ? progress.total : total;

        if (progress.status === undefined) {
          progress.status = status;
        } else {
          status = progress.status;
        }
      }

      progressChannel.next({
        ...(progress as json.JsonObject),
        ...(context.target && { target: context.target }),
        ...(context.builder && { builder: context.builder }),
        id: context.id,
      });
    }

    return new Observable<OutT>((observer) => {
      const subscriptions: Subscription[] = [];

      const inputSubscription = context.inboundBus.subscribe((i) => {
        switch (i.kind) {
          case JobInboundMessageKind.Input:
            onInput(i.value);
            break;
        }
      });

      function onInput(i: BuilderInput) {
        const builder = i.info as BuilderInfo;
        const loggerName = i.target
          ? targetStringFromTarget(i.target as Target)
          : builder.builderName;
        const logger = new logging.Logger(loggerName);

        subscriptions.push(logger.subscribe((entry) => log(entry)));

        const context: BuilderContext = {
          builder,
          workspaceRoot: i.workspaceRoot,
          currentDirectory: i.currentDirectory,
          target: i.target as Target,
          logger: logger,
          id: i.id,
          async scheduleTarget(
            target: Target,
            overrides: json.JsonObject = {},
            scheduleOptions: ScheduleOptions = {},
          ) {
            const run = await scheduleByTarget(target, overrides, {
              scheduler,
              logger: scheduleOptions.logger || logger.createChild(''),
              workspaceRoot: i.workspaceRoot,
              currentDirectory: i.currentDirectory,
            });

            // We don't want to subscribe errors and complete.
            subscriptions.push(run.progress.subscribe((event) => progressChannel.next(event)));

            return run;
          },
          async scheduleBuilder(
            builderName: string,
            options: json.JsonObject = {},
            scheduleOptions: ScheduleOptions = {},
          ) {
            const run = await scheduleByName(builderName, options, {
              scheduler,
              target: scheduleOptions.target,
              logger: scheduleOptions.logger || logger.createChild(''),
              workspaceRoot: i.workspaceRoot,
              currentDirectory: i.currentDirectory,
            });

            // We don't want to subscribe errors and complete.
            subscriptions.push(run.progress.subscribe((event) => progressChannel.next(event)));

            return run;
          },
          async getTargetOptions(target: Target) {
            return firstValueFrom(
              scheduler.schedule<Target, json.JsonValue, json.JsonObject>(
                '..getTargetOptions',
                target,
              ).output,
            );
          },
          async getProjectMetadata(target: Target | string) {
            return firstValueFrom(
              scheduler.schedule<Target | string, json.JsonValue, json.JsonObject>(
                '..getProjectMetadata',
                target,
              ).output,
            );
          },
          async getBuilderNameForTarget(target: Target) {
            return firstValueFrom(
              scheduler.schedule<Target, json.JsonValue, string>(
                '..getBuilderNameForTarget',
                target,
              ).output,
            );
          },
          async validateOptions<T extends json.JsonObject = json.JsonObject>(
            options: json.JsonObject,
            builderName: string,
          ) {
            return firstValueFrom(
              scheduler.schedule<[string, json.JsonObject], json.JsonValue, T>(
                '..validateOptions',
                [builderName, options],
              ).output,
            );
          },
          reportRunning() {
            switch (currentState) {
              case BuilderProgressState.Waiting:
              case BuilderProgressState.Stopped:
                progress({ state: BuilderProgressState.Running, current: 0, total }, context);
                break;
            }
          },
          reportStatus(status: string) {
            switch (currentState) {
              case BuilderProgressState.Running:
                progress({ state: currentState, status, current, total }, context);
                break;
              case BuilderProgressState.Waiting:
                progress({ state: currentState, status }, context);
                break;
            }
          },
          reportProgress(current: number, total?: number, status?: string) {
            switch (currentState) {
              case BuilderProgressState.Running:
                progress({ state: currentState, current, total, status }, context);
            }
          },
          addTeardown,
        };

        context.reportRunning();
        let result;
        try {
          result = fn(i.options as unknown as OptT, context);
          if (isBuilderOutput(result)) {
            result = of(result);
          } else if (!isObservable(result) && isAsyncIterable(result)) {
            result = fromAsyncIterable(result);
          } else {
            result = from(result);
          }
        } catch (e) {
          result = throwError(e);
        }

        // Manage some state automatically.
        progress({ state: BuilderProgressState.Running, current: 0, total: 1 }, context);
        subscriptions.push(
          result
            .pipe(
              defaultIfEmpty({ success: false } as unknown),
              tap(() => {
                progress({ state: BuilderProgressState.Running, current: total }, context);
                progress({ state: BuilderProgressState.Stopped }, context);
              }),
              mergeMap(async (value) => {
                // Allow the log queue to flush
                await new Promise<void>(setImmediate);

                return value;
              }),
            )
            .subscribe(
              (message) => observer.next(message as OutT),
              (error) => observer.error(error),
              () => observer.complete(),
            ),
        );
      }

      return () => {
        subscriptions.forEach((x) => x.unsubscribe());
        inputSubscription.unsubscribe();
      };
    });
  });

  return {
    handler,
    [BuilderSymbol]: true,
    [BuilderVersionSymbol]: require('../package.json').version,
    // Only needed for type safety around `Builder` types.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    __OptionT: null!,
  };
}

function isAsyncIterable<T>(obj: unknown): obj is AsyncIterable<T> {
  return !!obj && typeof (obj as AsyncIterable<T>)[Symbol.asyncIterator] === 'function';
}
