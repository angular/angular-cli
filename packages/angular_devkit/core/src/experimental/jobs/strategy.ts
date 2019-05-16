/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, Subject, concat, of } from 'rxjs';
import { finalize, ignoreElements, share, shareReplay, tap } from 'rxjs/operators';
import { JsonValue } from '../../json';
import {
  JobDescription,
  JobHandler,
  JobHandlerContext, JobInboundMessage,
  JobOutboundMessage,
  JobOutboundMessageKind,
} from './api';

const stableStringify = require('fast-json-stable-stringify');

export namespace strategy {

  export type JobStrategy<
    A extends JsonValue = JsonValue,
    I extends JsonValue = JsonValue,
    O extends JsonValue = JsonValue,
  > = (
    handler: JobHandler<A, I, O>,
    options?: Partial<Readonly<JobDescription>>,
  ) => JobHandler<A, I, O>;

  /**
   * Creates a JobStrategy that serializes every call. This strategy can be mixed between jobs.
   */
  export function serialize<
    A extends JsonValue = JsonValue,
    I extends JsonValue = JsonValue,
    O extends JsonValue = JsonValue,
  >(): JobStrategy<A, I, O> {
    let latest: Observable<JobOutboundMessage<O>> = of();

    return (handler, options) => {
      const newHandler = (argument: A, context: JobHandlerContext<A, I, O>) => {
        const previous = latest;
        latest = concat(
          previous.pipe(ignoreElements()),
          new Observable<JobOutboundMessage<O>>(o => handler(argument, context).subscribe(o)),
        ).pipe(
          shareReplay(0),
        );

        return latest;
      };

      return Object.assign(newHandler, {
        jobDescription: Object.assign({}, handler.jobDescription, options),
      });
    };
  }


  /**
   * Creates a JobStrategy that will always reuse a running job, and restart it if the job ended.
   * @param replayMessages Replay ALL messages if a job is reused, otherwise just hook up where it
   *        is.
   */
  export function reuse<
    A extends JsonValue = JsonValue,
    I extends JsonValue = JsonValue,
    O extends JsonValue = JsonValue,
  >(replayMessages = false): JobStrategy<A, I, O> {
    let inboundBus = new Subject<JobInboundMessage<I>>();
    let runContext: JobHandlerContext | null = null;
    let run: Observable<JobOutboundMessage<O>> | null = null;
    let state: JobOutboundMessage<O> | null = null;

    return (handler, options) => {
      const newHandler = (argument: A, context: JobHandlerContext<A, I, O>) => {
        // Forward inputs.
        const subscription = context.inboundBus.subscribe(inboundBus);

        if (run) {
          return concat(
            // Update state.
            of(state),
            run,
          ).pipe(
            finalize(() => subscription.unsubscribe()),
          );
        }

        run = handler(argument, { ...context, inboundBus: inboundBus.asObservable() }).pipe(
          tap(
            message => {
              if (message.kind == JobOutboundMessageKind.Start
                  || message.kind == JobOutboundMessageKind.OnReady
                  || message.kind == JobOutboundMessageKind.End) {
                state = message;
              }
            },
            undefined,
            () => {
              subscription.unsubscribe();
              inboundBus = new Subject<JobInboundMessage<I>>();
              run = null;
            },
          ),
          replayMessages ? shareReplay() : share(),
        );
        runContext = context;

        return run;
      };

      return Object.assign(newHandler, handler, options || {});
    };
  }


  /**
   * Creates a JobStrategy that will reuse a running job if the argument matches.
   * @param replayMessages Replay ALL messages if a job is reused, otherwise just hook up where it
   *        is.
   */
  export function memoize<
    A extends JsonValue = JsonValue,
    I extends JsonValue = JsonValue,
    O extends JsonValue = JsonValue,
  >(replayMessages = false): JobStrategy<A, I, O> {
    const runs = new Map<string, Observable<JobOutboundMessage<O>>>();

    return (handler, options) => {
      const newHandler = (argument: A, context: JobHandlerContext<A, I, O>) => {
        const argumentJson = stableStringify(argument);
        const maybeJob = runs.get(argumentJson);

        if (maybeJob) {
          return maybeJob;
        }

        const run = handler(argument, context).pipe(
          replayMessages ? shareReplay() : share(),
        );
        runs.set(argumentJson, run);

        return run;
      };

      return Object.assign(newHandler, handler, options || {});
    };
  }

}
