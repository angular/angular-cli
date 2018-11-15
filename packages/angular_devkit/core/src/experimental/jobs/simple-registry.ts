/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, of } from 'rxjs';
import { JsonValue, schema } from '../../json';
import { JobDescription, JobHandler, JobName, Registry, isJobHandler } from './api';
import { JobNameAlreadyRegisteredException } from './exception';


/**
 * SimpleJobRegistry job registration options.
 */
export interface RegisterJobOptions extends Partial<JobDescription> {}

/**
 * A simple job registry that keep a map of JobName => JobHandler internally.
 */
export class SimpleJobRegistry<
  MinimumArgumentValueT extends JsonValue = JsonValue,
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> implements Registry<MinimumArgumentValueT, MinimumInputValueT, MinimumOutputValueT> {
  private _jobNames = new Map<
    JobName,
    JobHandler<MinimumArgumentValueT, MinimumInputValueT, MinimumOutputValueT>
  >();

  get<
    A extends MinimumArgumentValueT = MinimumArgumentValueT,
    I extends MinimumInputValueT = MinimumInputValueT,
    O extends MinimumOutputValueT = MinimumOutputValueT,
  >(name: JobName): Observable<JobHandler<A, I, O> | null> {
    return of(this._jobNames.get(name) as (JobHandler<A, I, O> | null) || null);
  }

  /**
   * Register a job handler. The name must be unique.
   *
   * @param name The name of the job.
   * @param handler The function that will be called for the job.
   * @param options An optional list of options to override the handler. {@see RegisterJobOptions}
   */
  register<
    A extends MinimumArgumentValueT,
    I extends MinimumInputValueT,
    O extends MinimumOutputValueT,
  >(
    name: JobName,
    handler: JobHandler<A, I, O>,
    options?: RegisterJobOptions,
  ): void;

  /**
   * Register a job handler. The name must be unique.
   *
   * @param handler The function that will be called for the job.
   * @param options An optional list of options to override the handler. {@see RegisterJobOptions}
   */
  register<ArgumentT extends JsonValue, InputT extends JsonValue, OutputT extends JsonValue>(
    handler: JobHandler<ArgumentT, InputT, OutputT>,
    // This version MUST contain a name.
    options?: RegisterJobOptions & { name: string },
  ): void;

  register<ArgumentT extends JsonValue, InputT extends JsonValue, OutputT extends JsonValue>(
    nameOrHandler: JobName | JobHandler<ArgumentT, InputT, OutputT>,
    handlerOrOptions: JobHandler<ArgumentT, InputT, OutputT> | RegisterJobOptions = {},
    options: RegisterJobOptions = {},
  ): void {
    // Switch on the arguments.
    if (typeof nameOrHandler == 'string') {
      if (!isJobHandler(handlerOrOptions)) {
        // This is an error.
        throw new TypeError('Expected a JobHandler as second argument.');
      }

      this._register(nameOrHandler, handlerOrOptions, options);
    } else if (isJobHandler(nameOrHandler)) {
      if (typeof handlerOrOptions !== 'object') {
        // This is an error.
        throw new TypeError('Expected an object options as second argument.');
      }

      const name = options.name || nameOrHandler.jobDescription.name || handlerOrOptions.name;
      if (name === undefined) {
        throw new TypeError('Expected name to be a string.');
      }

      this._register(name, nameOrHandler, options);
    } else {
      throw new TypeError('Unrecognized arguments.');
    }
  }

  protected _register<
    ArgumentT extends JsonValue,
    InputT extends JsonValue,
    OutputT extends JsonValue,
  >(
    name: JobName,
    handler: JobHandler<ArgumentT, InputT, OutputT>,
    options: RegisterJobOptions,
  ): void {
    if (this._jobNames.has(name)) {
      // We shouldn't allow conflicts.
      throw new JobNameAlreadyRegisteredException(name);
    }

    // Merge all fields with the ones in the handler (to make sure we respect the handler).
    const argument = schema.mergeSchemas(
      handler.jobDescription.argument,
      options.argument,
    );
    const input = schema.mergeSchemas(
      handler.jobDescription.input,
      options.input,
    );
    const output = schema.mergeSchemas(
      handler.jobDescription.output,
      options.output,
    );

    // Create the job description.
    const jobDescription: JobDescription = {
      name,
      argument,
      output,
      input,
    };

    this._jobNames.set(name, Object.assign(handler.bind(undefined), { jobDescription }));
  }

  /**
   * Returns the job names of all jobs.
   */
  getJobNames(): JobName[] {
    return [...this._jobNames.keys()];
  }
}
