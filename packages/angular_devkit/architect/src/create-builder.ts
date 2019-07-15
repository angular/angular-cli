/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { analytics, experimental, json, logging } from '@angular-devkit/core';
import { Observable, Subscription, from, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
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
  isBuilderOutput,
  targetStringFromTarget,
} from './api';
import { Builder, BuilderSymbol, BuilderVersionSymbol } from './internal';
import { scheduleByName, scheduleByTarget } from './schedule-by-name';


export function createBuilder<
  OptT extends json.JsonObject,
  OutT extends BuilderOutput = BuilderOutput,
>(
  fn: BuilderHandlerFn<OptT>,
): Builder<OptT> {
  const cjh = experimental.jobs.createJobHandler;
  const handler = cjh<json.JsonObject, BuilderInput, OutT>((options, context) => {
    const scheduler = context.scheduler;
    const progressChannel = context.createChannel('progress');
    const logChannel = context.createChannel('log');
    const analyticsChannel = context.createChannel('analytics');
    let currentState: BuilderProgressState = BuilderProgressState.Stopped;
    const teardownLogics: Array<() => (PromiseLike<void> | void)> = [];
    let tearingDown = false;
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
        ...progress as json.JsonObject,
        ...(context.target && { target: context.target }),
        ...(context.builder && { builder: context.builder }),
        id: context.id,
      });
    }

    return new Observable<OutT>(observer => {
      const subscriptions: Subscription[] = [];

      const inputSubscription = context.inboundBus.subscribe(
        i => {
          switch (i.kind) {
            case experimental.jobs.JobInboundMessageKind.Stop:
              // Run teardown logic then complete.
              tearingDown = true;
              Promise.all(teardownLogics.map(fn => fn() || Promise.resolve()))
                .then(() => observer.complete(), err => observer.error(err));
              break;
            case experimental.jobs.JobInboundMessageKind.Input:
              if (!tearingDown) {
                onInput(i.value);
              }
              break;
          }
        },
      );

      function onInput(i: BuilderInput) {
        const builder = i.info as BuilderInfo;
        const loggerName = i.target
          ? targetStringFromTarget(i.target as Target)
          : builder.builderName;
        const logger = new logging.Logger(loggerName);

        subscriptions.push(logger.subscribe(entry => log(entry)));

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
            subscriptions.push(run.progress.subscribe(event => progressChannel.next(event)));

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
            subscriptions.push(run.progress.subscribe(event => progressChannel.next(event)));

            return run;
          },
          async getTargetOptions(target: Target) {
            return scheduler.schedule<Target, json.JsonValue, json.JsonObject>(
                    '..getTargetOptions', target).output.toPromise();
          },
          async getBuilderNameForTarget(target: Target) {
            return scheduler.schedule<Target, json.JsonValue, string>(
              '..getBuilderNameForTarget',
              target,
            ).output.toPromise();
          },
          async validateOptions<T extends json.JsonObject = json.JsonObject>(
            options: json.JsonObject,
            builderName: string,
          ) {
            return scheduler.schedule<[string, json.JsonObject], json.JsonValue, T>(
              '..validateOptions',
              [builderName, options],
            ).output.toPromise();
          },
          reportRunning() {
            switch (currentState) {
              case BuilderProgressState.Waiting:
              case BuilderProgressState.Stopped:
                progress({ state: BuilderProgressState.Running, current: 0, total  }, context);
                break;
            }
          },
          reportStatus(status: string) {
            switch (currentState) {
              case BuilderProgressState.Running:
                progress({ state: currentState, status, current, total  }, context);
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
          analytics: new analytics.ForwardingAnalytics(report => analyticsChannel.next(report)),
          addTeardown(teardown: () => (Promise<void> | void)): void {
            teardownLogics.push(teardown);
          },
        };

        context.reportRunning();
        let result;
        try {
          result = fn(i.options as OptT, context);
          if (isBuilderOutput(result)) {
            result = of(result);
          } else {
            result = from(result);
          }
        } catch (e) {
          result = throwError(e);
        }

        // Manage some state automatically.
        progress({ state: BuilderProgressState.Running, current: 0, total: 1 }, context);
        subscriptions.push(result.pipe(
          tap(() => {
            progress({ state: BuilderProgressState.Running, current: total }, context);
            progress({ state: BuilderProgressState.Stopped }, context);
          }),
        ).subscribe(
          message => observer.next(message as OutT),
          error => observer.error(error),
          () => observer.complete(),
        ));
      }

      return () => {
        subscriptions.forEach(x => x.unsubscribe());
        inputSubscription.unsubscribe();
      };
    });
  });

  return {
    handler,
    [BuilderSymbol]: true,
    [BuilderVersionSymbol]: require('../package.json').version,
  };
}
