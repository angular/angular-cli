/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { JsonObject, JsonValue, schema } from '../json';
import { LogEntry } from '../logger';

type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export type JobTypeName = string;
export type JobName = string;

export interface JobTypeDescription extends JsonObject {
  readonly type: JobTypeName;
  readonly input: DeepReadonly<schema.JsonSchema>;
  readonly output: DeepReadonly<schema.JsonSchema>;
}

export interface JobDescription extends JsonObject {
  readonly name: JobName;
  readonly strategy: JobStrategy;
  readonly priority: number;
  readonly type: JobTypeDescription;
  readonly input: DeepReadonly<schema.JsonSchema>;
  readonly output: DeepReadonly<schema.JsonSchema>;
}

/**
 * Dictates the way jobs execute when run multiple times.
 */
export enum JobStrategy {
  /**
   * Indicates that the job of the same name is run one after the other. Running the same job
   * twice would just wait for the last job to finish before starting.
   */
  Serialize = 0,

  /**
   * Indicates that the job can be run multiple times in parallel.
   */
  Parallelize = 1,

  /**
   * Indicates that the job should be reused if it's already running, otherwise it should be
   * started. This ignores inputs even if they changed.
   */
  Reuse = 2,

  /**
   * Indicates that a job should be run only once; running the job again will return the result
   * of the first and only time this job was run. This ignores inputs even if they changed.
   */
  Once = 3,

  /**
   * Indicates that a job should be reused if the inputs are the same. Even if the job isn't running
   * right now, it will be considered to return the same output and will return the same job.
   */
  Memoize = 4,

  Default = Parallelize,
}

export enum JobEventKind {
  Create = 0,
  Queue = 1,
  Start = 2,
  Log = 3,
  Progress = 4,
  Result= 5,
  End = 6,
}

export interface JobEventBase extends JsonObject {
  readonly description: JobDescription;
  readonly kind: JobEventKind;
}

/**
 * The Job has been created and will validate its input.
 */
export interface JobEventCreate extends JobEventBase {
  readonly kind: JobEventKind.Create;
}

/**
 * The Job has validated its input and will execute soon (depending on strategy). Done by the
 * scheduler.
 */
export interface JobEventQueue extends JobEventBase {
  readonly kind: JobEventKind.Queue;
}

/**
 * The Job started. This is done by the job itself.
 */
export interface JobEventStart extends JobEventBase {
  readonly kind: JobEventKind.Start;
}

/**
 * A logging event, supporting the logging.LogEntry.
 */
export interface JobEventLog extends JobEventBase {
  readonly kind: JobEventKind.Log;
  readonly entry: LogEntry;
}

/**
 * Progress notification.
 */
export interface JobEventProgress extends JobEventBase {
  readonly kind: JobEventKind.Progress;
  /**
   * Clamped between 0 and 1. 1 is considered 100% done.
   */
  readonly progress: number;
}

/**
 * A result is available.
 */
export type JobEventResult<OutputT extends JsonValue> = JobEventBase & {
  readonly kind: JobEventKind.Result;
  readonly output: OutputT;
};

/**
 * End of the job run.
 */
export interface JobEventEnd extends JobEventBase {
  readonly kind: JobEventKind.End;
};

/**
 * Generic event type.
 */
export type JobEvent<OutputT extends JsonValue = JsonValue> =
  JobEventQueue
  | JobEventCreate
  | JobEventStart
  | JobEventLog
  | JobEventProgress
  | JobEventResult<OutputT>
  | JobEventEnd;

/**
 * The context in which the job is run.
 */
export interface JobHandlerContext {
  readonly description: JobDescription;
  readonly scheduler: Scheduler;
  readonly dependencies: Job<{}>[];
}

/**
 * The Job Handler, which is a method that's executed for the job.
 */
export interface JobHandler<InputT extends JsonValue, OutputT extends JsonValue> {
  (
    input: InputT,
    context: JobHandlerContext,
  ): Observable<JobEvent<OutputT>>;
}


/**
 * The state of a job. These are changed as the job reports a new state through its events.
 */
export enum JobState {
  Queued = 0,
  Created = 1,
  Started = 2,
  Result = 3,
  Ended = 4,
}


/**
 * A Job instance, returned from scheduling a job.
 */
export interface Job<O extends JsonValue> extends Observable<JobEvent<O>> {
  /**
   * The unique ID of the job.
   */
  readonly id: symbol;

  /**
   * Description of the job, including its type.
   */
  readonly description: JobDescription;

  /**
   * This output is sugar for
   * `event.pipe(filter(x => x.kind == JobEventKind.End), map(x => x.output)).toPromise()`.
   */
  readonly output: Promise<O | undefined>;

  /**
   * The current state of the job.
   */
  readonly state: JobState;

  /**
   * A progress indication of the job, between 0 and 1. While the job is Started, this will be the
   * last value reported by a JobEventProgress event. If the job has ended this will be 1.
   */
  readonly progress: number;
}


export interface RegisterJobOptions {
  /**
   * The input schema of the job. By default this will be the same input as the job type. This is
   * required to be a superset of the job type's input.
   */
  input?: schema.JsonSchema;

  /**
   * The output schema of the job. By default this will be the same output as the job type. This is
   * required to be a superset of the job type's output.
   */
  output?: schema.JsonSchema;

  /**
   * The priority of the job. When registering a job for a type that already has a default job for
   * its type, the priority will be compared. If the priority is equal or greater on the new job,
   * it will overwrite the job.
   */
  priority?: number;

  /**
   * The strategy of execution of the job. {@see JobStrategy} for more information. This strategy
   * is attached to the Job itself, not its type.
   */
  strategy?: JobStrategy;
}

export interface ScheduleJobOptions {
  dependencies?: Job<{}> | Job<{}>[];
}

/**
 * A registry of jobs. Essentially a map of jobs and job types. Does not schedule any jobs.
 *
 * Job Types are "unique", as long as their input/output are compatible. Job Names are unique and
 * strictly enforced. They can also be tokens.
 */
export interface JobRegistry extends Scheduler {
  /**
   * Get a job description for a named job.
   *
   * @param name The name of the job.
   * @returns A description, or null if the job is not registered.
   */
  getDescription(name: JobName): JobDescription | null;

  /**
   * Get a job type description.
   *
   * @param type The name of the job type.
   * @returns A description, or null if the job type is not registered.
   */
  getTypeDescription(type: JobTypeName): JobTypeDescription | null;

  /**
   * Returns true if the job name has been registered.
   * @param name The name of the job.
   * @returns True if the job exists, false otherwise.
   */
  has(name: JobName): boolean;

  /**
   * Returns true if the job type name has been registered.
   * @param type The name of the job type.
   * @returns True if the job type exists, false otherwise.
   */
  hasType(type: JobTypeName): boolean;

  /**
   * Register a job handler. The name is unique, and the job type must exist. If the type has no
   * job registered to it, it will automatically register this job as the default job for its
   * type. Otherwise it will compare the priority (0 by default) and override the job type default
   * if the priority is equal or higher.
   *
   * @param name The name of the job.
   * @param type The type of job to register to.
   * @param handler The function that will be called for the job.
   * @param options A list of options. {@see RegisterJobOptions}
   */
  register<InputT extends JsonValue, OutputT extends JsonValue>(
    name: JobName,
    type: JobTypeName,
    handler: JobHandler<InputT, OutputT>,
    options?: RegisterJobOptions,
  ): void;

  /**
   * Register a job type.
   *
   * @param {JobTypeName} type
   * @param {JsonSchema} input
   * @param {JsonSchema} output
   */
  registerType(
    type: JobTypeName,
    input: schema.JsonSchema,
    output: schema.JsonSchema,
  ): void;

  /**
   * Set the default job handler for the job type. Overrides priority (but use the priority if
   * further job handlers are registered for the type.
   *
   * @param type The name of the type.
   * @param name The name of the job handler, or null to remove the current default without setting
   *   a new one.
   */
  setDefaultJobHandlerForType(type: JobTypeName, name: JobName | null): void;
}

/**
 * An interface that can schedule jobs.
 */
export interface Scheduler {
  /**
   * Schedule a job to be run, using its type.
   * @param type The type of job to be run.
   * @param input
   * @param options
   * @returns The Job being run.
   */
  schedule<I extends JsonValue, O extends JsonValue>(
    type: JobTypeName,
    input: I,
    options?: ScheduleJobOptions,
  ): Job<O>;

  /**
   * Schedule a job to be run, using its proper name.
   * @param name The name of the job.
   * @param input The input value to pass to the job.
   * @param options Options regarding to job.
   * @returns The Job being run. This job will not be run
   */
  scheduleJobByName<I extends JsonValue, O extends JsonValue>(
    name: JobName,
    input: I,
    options?: ScheduleJobOptions,
  ): Job<O>;
}
