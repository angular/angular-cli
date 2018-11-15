/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { Observable } from 'rxjs';
import { JsonValue, schema } from '../json';
import { Readwrite } from '../utils';
import { JobDescription, JobEvent, JobHandler, JobName } from './api';
import { JobDoesNotExistException } from './exception';

/**
 * A JobGroup can be used to
 */
export interface JobGroup<I extends JsonValue, O extends JsonValue> extends JobHandler<I, O> {
  /**
   * the name of the job.
   */
  readonly jobName?: string;

  /**
   * All the channel names supported by this job, and their schemas. This must be known in
   * advance, but can be omitted if no channel is supported.
   */
  readonly channels?: {
    readonly [name: string]: schema.JsonSchema;
  };

  /**
   * The input schema of the job. If unspecified, use the smallest intersection of all extends.
   */
  readonly input?: schema.JsonSchema;

  /**
   * The output schema of the job. If unspecified, use the smallest intersection of all extends.
   */
  readonly output?: schema.JsonSchema;

  /**
   * Set the default job if all conditionals failed.
   * @param jobName
   */
  setDefaultJob(jobName: string | null | { jobName: string }): void;

  /**
   * Add a conditional job that will be selected if the input fits a predicate.
   * @param predicate
   * @param jobName
   */
  addConditionalJob(predicate: (args: I) => boolean, jobName: string): void;
}


/**
 * Create a group that can dispatch to a sub job, depending on conditions.
 * @param options
 */
export function createGroup<I extends JsonValue, O extends JsonValue>(
  options: Partial<Readwrite<JobDescription>> & { jobName?: string } = {},
): JobGroup<I, O> {
  let defaultDelegate: JobName | null = null;
  const conditionalDelegateList: [(args: I) => boolean, JobName][] = [];

  const job: JobHandler<I, O> = (input, context) => {
    const maybeDelegate = conditionalDelegateList.find(([predicate]) => predicate(input));

    if (maybeDelegate) {
      return context.scheduler
        .schedule(maybeDelegate[1], input).outputChannel as Observable<JobEvent<O>>;
    } else if (defaultDelegate) {
      return context.scheduler
        .schedule(defaultDelegate, input).outputChannel as Observable<JobEvent<O>>;
    } else {
      throw new JobDoesNotExistException('<null>');
    }
  };

  return Object.assign(job, {
    ...options,

    setDefaultJob(jobName: string | null | { jobName: string }) {
      if (jobName && typeof jobName !== 'string') {
        jobName = jobName.jobName;
      }

      defaultDelegate = jobName;
    },
    addConditionalJob(predicate: (args: I) => boolean, jobName: string) {
      conditionalDelegateList.push([predicate, jobName]);
    },
  });
}
