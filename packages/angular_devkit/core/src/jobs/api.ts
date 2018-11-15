/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, Observer } from 'rxjs';
import { JsonObject, JsonValue, schema } from '../json';
import { LogEntry, LoggerApi } from '../logger';
import { DeepReadonly } from '../utils';

/**
 * Job Name is just a string (needs to be serializable).
 */
export type JobName = string;

/**
 * Metadata associated with a job.
 */
export interface JobDescription extends JsonObject {
  readonly name: JobName;
  readonly input: DeepReadonly<schema.JsonSchema>;
  readonly output: DeepReadonly<schema.JsonSchema>;

  readonly channels: { [name: string]: DeepReadonly<schema.JsonSchema> };
  readonly inputChannel: DeepReadonly<schema.JsonSchema>;
}

/**
 * Events that can be sent TO a job. The job needs to listen to those.
 */
export enum JobInputKind {
  Ping = 0,
  Stop = 1,

  // Channel specific events.
  ChannelMessage = 100,
  ChannelError,
  ChannelComplete,
}

/** Base interface for the all job input events. */
export interface JobInputBase extends JsonObject {
  /**
   * The kind of event this is.
   */
  readonly kind: JobInputKind;
}

/**
 * A ping to the job. The job should reply with a pong as soon as possible.
 */
export interface JobInputPing extends JobInputBase {
  readonly kind: JobInputKind.Ping;
}

/**
 * Stop the job. This is handled by the job itself and jobs might not handle it.
 * This is equivalent to SIGTERM.
 */
export interface JobInputStop extends JobInputBase {
  readonly kind: JobInputKind.Stop;
}


/**
 * Base interface for all job event related to channels.
 */
export interface JobInputChannelBase extends JobInputBase {
  // There's only 1 input channel.
}

/**
 * A Job wants to send a message to a channel. This can be marshaled, and the Job object
 * has helpers to transform this into an observable. The context also can create RxJS subjects that
 * marshall events through a channel.
 */
export interface JobInputChannelMessage extends JobInputChannelBase {
  readonly kind: JobInputKind.ChannelMessage;

  /**
   * The message being sent to the channel.
   */
  readonly message: JsonValue;
}

/**
 * A Job wants to send an error to one of its channel. This is the equivalent of throwing through
 * an Observable. The side channel will not receive any more messages after this, and will not
 * complete.
 */
export interface JobInputChannelError extends JobInputChannelBase {
  readonly kind: JobInputKind.ChannelError;

  /**
   * The error message being sent to the channel.
   */
  readonly error: JsonValue;
}

/**
 * A Job wants to close the channel, as completed. This is done automatically when the job ends,
 * or can be done from the job to close it. A closed channel cannot be reopened.
 */
export interface JobInputChannelComplete extends JobInputChannelBase {
  readonly kind: JobInputKind.ChannelComplete;
}

export type JobInput =
  JobInputPing
  | JobInputStop
  | JobInputChannelMessage
  | JobInputChannelError
  | JobInputChannelComplete;

/**
 * Kind of events that can be outputted from a job.
 */
export enum JobEventKind {
  // Lifecycle specific events.
  Create = 0,
  Start,
  End,
  Pong,

  // Feedback events.
  Progress,
  Log,
  Output,

  // Channel specific events.
  ChannelMessage = 100,
  ChannelError,
  ChannelComplete,
}

/** Base interface for the all job events. */
export interface JobEventBase extends JsonObject {
  /**
   * The Job Description.
   */
  readonly description: JobDescription;

  /**
   * The kind of event this is.
   */
  readonly kind: JobEventKind;
}

/**
 * The Job has been created and will validate its input.
 */
export interface JobEventCreate extends JobEventBase {
  readonly kind: JobEventKind.Create;
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
 * An output value is available.
 */
export interface JobEventOutput<OutputT extends JsonValue> extends JobEventBase {
  readonly kind: JobEventKind.Output;
  readonly output: OutputT;
}


/**
 * Base interface for all job event related to channels.
 */
export interface JobEventChannelBase extends JobEventBase {
  /**
   * The name of the channel.
   */
  readonly name: string;
}

/**
 * A Job wants to send a message to a channel. This can be marshaled, and the Job object
 * has helpers to transform this into an observable. The context also can create RxJS subjects that
 * marshall events through a channel.
 */
export interface JobEventChannelMessage extends JobEventChannelBase {
  readonly kind: JobEventKind.ChannelMessage;

  /**
   * The message being sent to the channel.
   */
  readonly message: JsonValue;
}

/**
 * A Job wants to send an error to one of its channel. This is the equivalent of throwing through
 * an Observable. The side channel will not receive any more messages after this, and will not
 * complete.
 */
export interface JobEventChannelError extends JobEventChannelBase {
  readonly kind: JobEventKind.ChannelError;

  /**
   * The error message being sent to the channel.
   */
  readonly error: JsonValue;
}

/**
 * A Job wants to close the channel, as completed. This is done automatically when the job ends,
 * or can be done from the job to close it. A closed channel cannot be reopened.
 */
export interface JobEventChannelComplete extends JobEventChannelBase {
  readonly kind: JobEventKind.ChannelComplete;
}

/**
 * End of the job run.
 */
export interface JobEventEnd extends JobEventBase {
  readonly kind: JobEventKind.End;
}

/**
 * The Job has been created and will validate its input.
 */
export interface JobEventPong extends JobEventBase {
  readonly kind: JobEventKind.Pong;
}

/**
 * Generic event type.
 */
export type JobEvent<OutputT extends JsonValue> =
  JobEventCreate
  | JobEventStart
  | JobEventLog
  | JobEventProgress
  | JobEventOutput<OutputT>
  | JobEventChannelMessage
  | JobEventChannelError
  | JobEventChannelComplete
  | JobEventEnd
  | JobEventPong;

/**
 * The context in which the job is run.
 */
export interface JobHandlerContext<
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> {
  readonly description: JobDescription;
  readonly scheduler: Scheduler<MinimumInputValueT, MinimumOutputValueT>;
  readonly dependencies: Job<{}>[];

  readonly input: Observable<JobInput>;
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
  Ended = 4,
}


/**
 * A Job instance, returned from scheduling a job. A Job Instance is _not_ serializable.
 */
export interface Job<O extends JsonValue> {
  /**
   * The unique ID of the job.
   */
  readonly id: symbol;

  /**
   * Description of the job.
   */
  readonly description: JobDescription;

  /**
   * The input to the job. This goes through the input channel as messages.
   */
  readonly input: Observer<JsonValue>;

  /**
   * Outputs of this Job. This is sugar for
   * `this.pipe(filter(x => x.kind == JobEventKind.Output), map(x => x.output))`.
   */
  readonly output: Observable<O>;

  /**
   * Last output for this Job. This is sugar for `output.pipe(last()).toPromise()`.
   */
  readonly promise: Promise<O | undefined>;

  /**
   * The current state of the job.
   */
  readonly state: JobState;

  /**
   * A progress indication of the job, between 0 and 1. While the job is Started, this will be the
   * last value reported by a JobEventProgress event. If the job has ended this will be 1.
   */
  readonly progress: number;

  /**
   * All channels available.
   */
  readonly channels: { [name: string]: Observable<JsonValue> };

  /**
   * The JobInput events TO the job.
   */
  readonly inputChannel: Observer<JobInput>;

  /**
   * The JobEvent FROM the job.
   */
  readonly outputChannel: Observable<JobEvent<O>>;
}

/**
 * Options for scheduling jobs.
 */
export interface ScheduleJobOptions {
  /**
   * Where should logging be passed in. By default logging will be dropped.
   */
  logger?: LoggerApi;

  /**
   * Jobs that need to finish before scheduling this job. These dependencies will not be passed
   * to the job itself.
   */
  dependencies?: Job<{}> | Job<{}>[];
}

/**
 * An interface that can schedule jobs.
 */
export interface Scheduler<
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> {
  /**
   * Get a job description for a named job.
   *
   * @param name The name of the job.
   * @returns A description, or null if the job is not registered.
   */
  getDescription(name: JobName): JobDescription | null;

  /**
   * Returns true if the job name has been registered.
   * @param name The name of the job.
   * @returns True if the job exists, false otherwise.
   */
  has(name: JobName): boolean;

  /**
   * Pause the scheduler, temporary queueing _new_ jobs. Returns a resume function that should be
   * used to resume execution. If multiple `pause()` were called, all their resume functions must
   * be called before the Scheduler actually starts new jobs. Additional calls to the same resume
   * function will have no effect.
   *
   * Jobs already running are NOT paused. This is pausing the scheduler only.
   */
  pause(): () => void;

  /**
   * Schedule a job to be run, using its name.
   * @param name The name of job to be run.
   * @param input
   * @param options
   * @returns The Job being run.
   */
  schedule<I extends MinimumInputValueT, O extends MinimumOutputValueT>(
    name: JobName,
    input: I,
    options?: ScheduleJobOptions,
  ): Job<O>;
}
