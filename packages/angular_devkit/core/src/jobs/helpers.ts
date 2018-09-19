/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { Observable } from 'rxjs';
import { JsonValue } from '../json';
import { Logger, LoggerApi } from '../logger';
import { isPromise } from '../utils';
import { JobEvent, JobEventKind, JobHandler, JobHandlerContext } from './api';

/**
 * Make a simple job handler that sets start, progress and end from a function that's synchronous
 * or does not report progress.
 *
 * @param fn The function to create a handler for.
 */
export function makeJobHandler<I extends JsonValue, O extends JsonValue>(
  fn: (input: I, context: JobHandlerContext | { logger: LoggerApi }) => O | Promise<O>,
): JobHandler<I, O> {
  return (input: I, context) => {
    const description = context.description;

    return new Observable<JobEvent<O>>(subject => {
      subject.next({ kind: JobEventKind.Start, description });

      // Configure a logger to pass in as additional context.
      const logger = new Logger('job');
      logger.subscribe(entry => {
        subject.next({
          kind: JobEventKind.Log,
          description,
          entry,
        });
      });

      // Execute the function with the additional context.
      subject.next({ kind: JobEventKind.Progress, description, progress: 0 });
      const result = fn(input, { ...context, logger });

      // If the result is a promise, simply wait for it to complete before reporting full progress
      // and the result.
      if (isPromise(result)) {
        result.then(result => {
          subject.next({ kind: JobEventKind.Progress, description, progress: 1 });
          subject.next({ kind: JobEventKind.End, description, output: result });
          subject.complete();
        }, err => subject.error(err));
      } else {
        // If it's a scalar value, report it synchronously.
        subject.next({ kind: JobEventKind.Progress, description, progress: 1 });
        subject.next({ kind: JobEventKind.End, description, output: result });
        subject.complete();
      }
    });
  };
}
