/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, of } from 'rxjs';
import { share, shareReplay } from 'rxjs/operators';
import { JsonValue, stableStringify } from '../json';
import { JobDescription, JobEvent, JobHandlerContext } from './api';
import { JobHandlerWithExtra } from './create-job';

type JobStrategy<I extends JsonValue, O extends JsonValue> = (
  handler: JobHandlerWithExtra<I, O>,
  options?: Partial<Readonly<JobDescription>>,
) => JobHandlerWithExtra<I, O>;

/**
 * Creates a JobStrategy that serializes every call. This strategy can be mixed between jobs.
 */
export function serialize<
  I extends JsonValue = JsonValue,
  O extends JsonValue = JsonValue,
>(): JobStrategy<I, O> {
  let latest: Observable<JobEvent<O>> = of();

  return (handler, options) => {
    const newHandler = (input: I, context: JobHandlerContext) => {
      const previous = latest;
      latest = new Observable<JobEvent<O>>(subject => {
        previous.subscribe(undefined, undefined, () => handler(input, context).subscribe(subject));
      }).pipe(
        shareReplay(),
      );

      return latest;
    };

    return Object.assign(newHandler, handler, options || {});
  };
}


/**
 * Creates a JobStrategy that will reuse a running job if the input matches.
 * @param replayEvents Replay ALL events if a job is reused, otherwise just hook up where it is.
 */
export function memoize<
  I extends JsonValue = JsonValue,
  O extends JsonValue = JsonValue,
>(replayEvents = false): JobStrategy<I, O> {
  const runs = new Map<string, Observable<JobEvent<O>>>();

  return (handler, options) => {
    const newHandler = (input: I, context: JobHandlerContext) => {
      const inputJson = stableStringify(input);
      const maybeJob = runs.get(inputJson);

      if (maybeJob) {
        return maybeJob;
      }

      const run = handler(input, context).pipe(
        replayEvents ? shareReplay() : share(),
      );
      runs.set(inputJson, run);

      return run;
    };

    return Object.assign(newHandler, handler, options || {});
  };
}
