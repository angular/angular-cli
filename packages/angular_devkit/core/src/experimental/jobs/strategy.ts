/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, concat, of } from 'rxjs';
import { ignoreElements, share, shareReplay } from 'rxjs/operators';
import { JsonValue } from '../../json';
import { JobDescription, JobHandler, JobHandlerContext, JobOutboundMessage } from './api';

const stableStringify = require('fast-json-stable-stringify');

export namespace strategy {

  export type JobStrategy<A extends JsonValue, I extends JsonValue, O extends JsonValue> = (
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
