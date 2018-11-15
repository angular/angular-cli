/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonValue, schema } from '../json';
import { JobDescription, JobHandler, JobName } from './api';
import { JobDoesNotExistException, JobNameAlreadyRegisteredException } from './exception';
import { SimpleScheduler, SimpleSchedulerJobDescription } from './simple-scheduler';


/**
 * SimpleJobRegistry job registration options.
 */
export interface RegisterJobOptions {
  /**
   * The input schema.
   */
  input?: schema.JsonSchema;
  /**
   * The output schema.
   */
  output?: schema.JsonSchema;

  /**
   * Schemas of all channels.
   */
  channels?: { [name: string]: schema.JsonSchema };

  /**
   * Schema of the input channel.
   */
  inputChannel?: schema.JsonSchema;

  /**
   * The name of the job to register. This can be used to override the JobHandler's information.
   */
  jobName?: JobName;

  /**
   * Compatible jobs to this one, ie. jobs that have an input and output schema that is a subset
   * of this one. Inputs and Outputs will be validated against this job as well.
   */
  extends?: JobName;
}

/**
 * A simple job registry that executes jobs in the current process as they come.
 */
export class SimpleJobRegistry extends SimpleScheduler {
  private _jobNames = new Map<JobName, SimpleSchedulerJobDescription>();

  protected _createDescription(name: JobName): SimpleSchedulerJobDescription | null {
    return this._jobNames.get(name) || null;
  }

  /**
   * Register a job handler. The name must be unique.
   *
   * @param name The name of the job.
   * @param handler The function that will be called for the job.
   * @param options An optional list of options to override the handler. {@see RegisterJobOptions}
   */
  register<InputT extends JsonValue, OutputT extends JsonValue>(
    name: JobName,
    handler: JobHandler<InputT, OutputT> & RegisterJobOptions,
    options?: RegisterJobOptions,
  ): void;

  /**
   * Register a job handler. The name must be unique.
   *
   * @param handler The function that will be called for the job.
   * @param options An optional list of options to override the handler. {@see RegisterJobOptions}
   */
  register<InputT extends JsonValue, OutputT extends JsonValue>(
    handler: JobHandler<InputT, OutputT> & RegisterJobOptions,
    // This version MUST contain a name.
    options?: RegisterJobOptions,
  ): void;

  /**
   * Register a job handler. The name must be unique.
   *
   * @param name The name of the job.
   * @param handler The function that will be called for the job.
   * @param options A list of options. {@see RegisterJobOptions}
   */
  register<InputT extends JsonValue, OutputT extends JsonValue>(
    name: JobName,
    handler: JobHandler<InputT, OutputT>,
    options: RegisterJobOptions,
  ): void;

  register<InputT extends JsonValue, OutputT extends JsonValue>(
    nameOrHandler: JobName | (JobHandler<InputT, OutputT> & RegisterJobOptions),
    handlerOrOptions: JobHandler<InputT, OutputT>
        | (JobHandler<InputT, OutputT> & RegisterJobOptions)
        | RegisterJobOptions = {},
    options: RegisterJobOptions = {},
  ): void {
    // Switch on the input.
    if (typeof nameOrHandler == 'string') {
      if (typeof handlerOrOptions === 'object') {
        // This is an error.
        throw new TypeError('Expected function as the handler.');
      }

      this._register(nameOrHandler, handlerOrOptions, { ...options, ...handlerOrOptions });
    } else if (typeof handlerOrOptions == 'function') {
      if (typeof handlerOrOptions === 'function') {
        // This is an error.
        throw new TypeError('Expected object as the handler.');
      }

      const name = nameOrHandler.jobName || handlerOrOptions.jobName;
      if (name === undefined) {
        throw new TypeError('Expected name to be a string.');
      }

      this._register(name, handlerOrOptions, { ...handlerOrOptions, ...options });
    } else {
      const name = nameOrHandler.jobName || handlerOrOptions.jobName;
      if (name === undefined) {
        throw new TypeError('Expected name to be a string.');
      }

      this._register(name, nameOrHandler, { ...nameOrHandler, ...handlerOrOptions });
    }
  }

  protected _register<InputT extends JsonValue, OutputT extends JsonValue>(
    name: JobName,
    handler: JobHandler<InputT, OutputT>,
    options: RegisterJobOptions,
  ): void {
    if (this.has(name)) {
      // We shouldn't allow conflicts.
      throw new JobNameAlreadyRegisteredException(name);
    }

    let { input, output } = options;
    let extendsInternalDesc: SimpleSchedulerJobDescription | undefined = undefined;

    if (options.extends) {
      const x = this._jobNames.get(options.extends);
      if (!x) {
        throw new JobDoesNotExistException(options.extends);
      }
      extendsInternalDesc = x;
    }

    // Default to `any`.
    if (!input) {
      input = true;
    }
    if (!output) {
      output = true;
    }

    // Create the job description.
    const description: JobDescription = {
      name,
      input,
      output,
      inputChannel: options.inputChannel || true,
      channels: options.channels || {},
    };

    this._jobNames.set(name, {
      description,
      handler,
      extends: extendsInternalDesc,
    });
  }

  /**
   * Returns a list of jobs that extends the job passed in.
   * @param name The job to look for.
   */
  getJobsExtending(name: JobName): JobDescription[] {
    return [...this._jobNames.values()]
      .filter(x => x.extends && x.extends.description.name === name)
      .map(x => x.description);
  }

  /**
   * Returns the job names of all jobs.
   */
  getJobNames(): JobName[] {
    return [...this._jobNames.keys()];
  }
}
