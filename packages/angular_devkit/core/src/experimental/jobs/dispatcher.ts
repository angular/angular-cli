/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { JsonValue } from '../../json/index';
import { Readwrite } from '../../utils/index';
import {
  Job,
  JobDescription,
  JobHandler,
  JobHandlerContext,
  JobName,
  isJobHandler,
} from './api';
import { JobDoesNotExistException } from './exception';

/**
 * A JobDispatcher can be used to dispatch between multiple jobs.
 */
export interface JobDispatcher<
  A extends JsonValue,
  I extends JsonValue,
  O extends JsonValue,
> extends JobHandler<A, I, O> {
  /**
   * Set the default job if all conditionals failed.
   * @param name The default name if all conditions are false.
   */
  setDefaultJob(name: JobName | null | JobHandler<JsonValue, JsonValue, JsonValue>): void;

  /**
   * Add a conditional job that will be selected if the input fits a predicate.
   * @param predicate
   * @param name
   */
  addConditionalJob(predicate: (args: A) => boolean, name: string): void;
}


/**
 * OnReady a dispatcher that can dispatch to a sub job, depending on conditions.
 * @param options
 */
export function createDispatcher<
  A extends JsonValue,
  I extends JsonValue,
  O extends JsonValue,
>(
  options: Partial<Readwrite<JobDescription>> = {},
): JobDispatcher<A, I, O> {
  let defaultDelegate: JobName | null = null;
  const conditionalDelegateList: [(args: A) => boolean, JobName][] = [];

  const job: JobHandler<A, I, O> = Object.assign((argument: A, context: JobHandlerContext) => {
    const maybeDelegate = conditionalDelegateList.find(([predicate]) => predicate(argument));
    let delegate: Job<A, I, O> | null = null;

    if (maybeDelegate) {
      delegate = context.scheduler.schedule(maybeDelegate[1], argument);
    } else if (defaultDelegate) {
      delegate = context.scheduler.schedule(defaultDelegate, argument);
    } else {
      throw new JobDoesNotExistException('<null>');
    }

    context.inboundBus.subscribe(delegate.inboundBus);

    return delegate.outboundBus;
  }, {
    jobDescription: options,
  });

  return Object.assign(job, {
    setDefaultJob(name: JobName | null | JobHandler<JsonValue, JsonValue, JsonValue>) {
      if (isJobHandler(name)) {
        name = name.jobDescription.name === undefined ? null : name.jobDescription.name;
      }

      defaultDelegate = name;
    },
    addConditionalJob(predicate: (args: A) => boolean, name: JobName) {
      conditionalDelegateList.push([predicate, name]);
    },
  });
}
