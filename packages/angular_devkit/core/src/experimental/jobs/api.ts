/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, Observer } from 'rxjs';
import { JsonObject, JsonValue, schema } from '../../json/index';
import { DeepReadonly } from '../../utils/index';

/**
 * A job name is just a string (needs to be serializable).
 */
export type JobName = string;


/**
 * The job handler function, which is a method that's executed for the job.
 */
export interface JobHandler<
  ArgT extends JsonValue,
  InputT extends JsonValue,
  OutputT extends JsonValue,
> {
  (
    argument: ArgT,
    context: JobHandlerContext<ArgT, InputT, OutputT>,
  ): Observable<JobOutboundMessage<OutputT>>;

  jobDescription: Partial<JobDescription>;
}


/**
 * The context in which the job is run.
 */
export interface JobHandlerContext<
  MinimumArgumentValueT extends JsonValue = JsonValue,
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> {
  readonly description: JobDescription;
  readonly scheduler: Scheduler<JsonValue, JsonValue, JsonValue>;

  // In this context, JsonValue is comparable to `any`.
  readonly dependencies: Job<JsonValue, JsonValue, JsonValue>[];

  readonly inboundBus: Observable<JobInboundMessage<MinimumInputValueT>>;
}


/**
 * Metadata associated with a job.
 */
export interface JobDescription extends JsonObject {
  readonly name: JobName;

  readonly argument: DeepReadonly<schema.JsonSchema>;
  readonly input: DeepReadonly<schema.JsonSchema>;
  readonly output: DeepReadonly<schema.JsonSchema>;
}

/**
 * Messages that can be sent TO a job. The job needs to listen to those.
 */
export enum JobInboundMessageKind {
  Ping = 'ip',
  Stop = 'is',

  // Channel specific messages.
  Input = 'in',
  // Input channel does not allow completion / error. Erroring this will just close the Subject
  // but not notify the job.
}

/** Base interface for the all job inbound messages. */
export interface JobInboundMessageBase extends JsonObject {
  /**
   * The kind of message this is.
   */
  readonly kind: JobInboundMessageKind;
}

/**
 * A ping to the job. The job should reply with a pong as soon as possible.
 */
export interface JobInboundMessagePing extends JobInboundMessageBase {
  readonly kind: JobInboundMessageKind.Ping;

  /**
   * An ID that should be returned in the corresponding Pong.
   */
  readonly id: number;
}

/**
 * Stop the job. This is handled by the job itself and jobs might not handle it. It will also
 * unsubscribe from the Observable<>.
 * This is equivalent to SIGTERM.
 */
export interface JobInboundMessageStop extends JobInboundMessageBase {
  readonly kind: JobInboundMessageKind.Stop;
}

/**
 * A Job wants to send a message to a channel. This can be marshaled, and the Job object
 * has helpers to transform this into an observable. The context also can create RxJS subjects that
 * marshall messages through a channel.
 */
export interface JobInboundMessageInput<InputT extends JsonValue> extends JobInboundMessageBase {
  readonly kind: JobInboundMessageKind.Input;

  /**
   * The input being sent to the job.
   */
  readonly value: InputT;
}

export type JobInboundMessage<InputT extends JsonValue> =
  JobInboundMessagePing
  | JobInboundMessageStop
  | JobInboundMessageInput<InputT>
  ;

/**
 * Kind of messages that can be outputted from a job.
 */
export enum JobOutboundMessageKind {
  // Lifecycle specific messages.
  OnReady = 'c',
  Start = 's',
  End = 'e',
  Pong = 'p',

  // Feedback messages.
  Output = 'o',

  // Channel specific messages.
  ChannelCreate = 'cn',
  ChannelMessage = 'cm',
  ChannelError = 'ce',
  ChannelComplete = 'cc',
}

/** Base interface for the all job messages. */
export interface JobOutboundMessageBase {
  /**
   * The job description.
   */
  readonly description: JobDescription;

  /**
   * The kind of message this is.
   */
  readonly kind: JobOutboundMessageKind;
}

/**
 * The job has been created and will validate its input.
 */
export interface JobOutboundMessageOnReady extends JobOutboundMessageBase {
  readonly kind: JobOutboundMessageKind.OnReady;
}

/**
 * The job started. This is done by the job itself.
 */
export interface JobOutboundMessageStart extends JobOutboundMessageBase {
  readonly kind: JobOutboundMessageKind.Start;
}

/**
 * An output value is available.
 */
export interface JobOutboundMessageOutput<
  OutputT extends JsonValue,
> extends JobOutboundMessageBase {
  readonly kind: JobOutboundMessageKind.Output;

  /**
   * The message being outputted from the job.
   */
  readonly value: OutputT;
}


/**
 * Base interface for all job message related to channels.
 */
export interface JobOutboundMessageChannelBase extends JobOutboundMessageBase {
  /**
   * The name of the channel.
   */
  readonly name: string;
}

/**
 * A job wants to send a message to a channel. This can be marshaled, and the Job object
 * has helpers to transform this into an observable. The context also can create RxJS subjects that
 * marshall messages through a channel.
 */
export interface JobOutboundMessageChannelMessage extends JobOutboundMessageChannelBase {
  readonly kind: JobOutboundMessageKind.ChannelMessage;

  /**
   * The message being sent to the channel.
   */
  readonly message: JsonValue;
}

/**
 * A job wants to send an error to one of its channel. This is the equivalent of throwing through
 * an Observable. The side channel will not receive any more messages after this, and will not
 * complete.
 */
export interface JobOutboundMessageChannelError extends JobOutboundMessageChannelBase {
  readonly kind: JobOutboundMessageKind.ChannelError;

  /**
   * The error message being sent to the channel.
   */
  readonly error: JsonValue;
}

/**
 * A job wants to create a new channel.
 */
export interface JobOutboundMessageChannelCreate extends JobOutboundMessageChannelBase {
  readonly kind: JobOutboundMessageKind.ChannelCreate;
}

/**
 * A job wants to close the channel, as completed. This is done automatically when the job ends,
 * or can be done from the job to close it. A closed channel might be reopened, but the user
 * need to recall getChannel().
 */
export interface JobOutboundMessageChannelComplete extends JobOutboundMessageChannelBase {
  readonly kind: JobOutboundMessageKind.ChannelComplete;
}

/**
 * OnEnd of the job run.
 */
export interface JobOutboundMessageEnd extends JobOutboundMessageBase {
  readonly kind: JobOutboundMessageKind.End;
}

/**
 * A pong response from a ping input. The id is the same as the one passed in.
 */
export interface JobOutboundMessagePong extends JobOutboundMessageBase {
  readonly kind: JobOutboundMessageKind.Pong;

  /**
   * The ID that was passed in the `Ping` messages.
   */
  readonly id: number;
}

/**
 * Generic message type.
 */
export type JobOutboundMessage<OutputT extends JsonValue> =
  JobOutboundMessageOnReady
  | JobOutboundMessageStart
  | JobOutboundMessageOutput<OutputT>
  | JobOutboundMessageChannelCreate
  | JobOutboundMessageChannelMessage
  | JobOutboundMessageChannelError
  | JobOutboundMessageChannelComplete
  | JobOutboundMessageEnd
  | JobOutboundMessagePong
  ;


/**
 * The state of a job. These are changed as the job reports a new state through its messages.
 */
export enum JobState {
  /**
   * The job was queued and is waiting to start.
   */
  Queued = 'queued',
  /**
   * The job description was found, its dependencies (see "Synchronizing and Dependencies")
   * are done running, and the job's argument is validated and the job's code will be executed.
   */
  Ready = 'ready',
  /**
   * The job has been started. The job implementation is expected to send this as soon as its
   * work is starting.
   */
  Started = 'started',
  /**
   * The job has ended and is done running.
   */
  Ended = 'ended',
  /**
   * An error occured and the job stopped because of internal state.
   */
  Errored = 'errored',
}


/**
 * A Job instance, returned from scheduling a job. A Job instance is _not_ serializable.
 */
export interface Job<
  ArgumentT extends JsonValue = JsonValue,
  InputT extends JsonValue = JsonValue,
  OutputT extends JsonValue = JsonValue,
> {
  /**
   * Description of the job. Resolving the job's description can be done asynchronously, so this
   * is an observable that will resolve when it's ready.
   */
  readonly description: Observable<JobDescription>;

  /**
   * Argument sent when scheduling the job. This is a copy of the argument.
   */
  readonly argument: ArgumentT;

  /**
   * The input to the job. This goes through the input channel as messages.
   */
  readonly input: Observer<InputT>;

  /**
   * Outputs of this job.
   */
  readonly output: Observable<OutputT>;

  /**
   * The current state of the job.
   */
  readonly state: JobState;

  /**
   * Get a channel that validates against the schema. Messages will be filtered by the schema.
   * @param name The name of the channel.
   * @param schema A schema to use to validate messages.
   */
  getChannel<T extends JsonValue>(name: string, schema?: schema.JsonSchema): Observable<T>;

  /**
   * Pings the job and wait for the resulting Pong before completing.
   */
  ping(): Observable<never>;

  /**
   * Stops the job from running. This is different than unsubscribing from the output as in it
   * sends the JobInboundMessageKind.Stop raw input to the job.
   */
  stop(): void;

  /**
   * The JobInboundMessage messages TO the job.
   */
  readonly inboundBus: Observer<JobInboundMessage<InputT>>;

  /**
   * The JobOutboundMessage FROM the job.
   */
  readonly outboundBus: Observable<JobOutboundMessage<OutputT>>;
}

/**
 * Options for scheduling jobs.
 */
export interface ScheduleJobOptions {
  /**
   * Jobs that need to finish before scheduling this job. These dependencies will be passed
   * to the job itself in its context.
   */
  dependencies?: Job | Job[];
}

export interface Registry<
  MinimumArgumentValueT extends JsonValue = JsonValue,
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> {
  /**
   * Get a job handler.
   * @param name The name of the job to get a handler from.
   */
  get<
    A extends MinimumArgumentValueT,
    I extends MinimumInputValueT,
    O extends MinimumOutputValueT,
  >(name: JobName): Observable<JobHandler<A, I, O> | null>;
}

/**
 * An interface that can schedule jobs.
 */
export interface Scheduler<
  MinimumArgumentValueT extends JsonValue = JsonValue,
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> {
  /**
   * Get a job description for a named job.
   *
   * @param name The name of the job.
   * @returns A description, or null if no description is available for this job.
   */
  getDescription(name: JobName): Observable<JobDescription | null>;

  /**
   * Returns true if the job name has been registered.
   * @param name The name of the job.
   * @returns True if the job exists, false otherwise.
   */
  has(name: JobName): Observable<boolean>;

  /**
   * Pause the scheduler, temporary queueing _new_ jobs. Returns a resume function that should be
   * used to resume execution. If multiple `pause()` were called, all their resume functions must
   * be called before the Scheduler actually starts new jobs. Additional calls to the same resume
   * function will have no effect.
   *
   * Jobs already running are NOT paused. This is pausing the scheduler only.
   *
   * @returns A function that can be run to resume the scheduler. If multiple `pause()` calls
   *          were made, all their return function must be called (in any order) before the
   *          scheduler can resume.
   */
  pause(): () => void;

  /**
   * Schedule a job to be run, using its name.
   * @param name The name of job to be run.
   * @param argument The argument to send to the job when starting it.
   * @param options Scheduling options.
   * @returns The job being run.
   */
  schedule<
    A extends MinimumArgumentValueT,
    I extends MinimumInputValueT,
    O extends MinimumOutputValueT,
  >(
    name: JobName,
    argument: A,
    options?: ScheduleJobOptions,
  ): Job<A, I, O>;
}


export function isJobHandler<
  A extends JsonValue,
  I extends JsonValue,
  O extends JsonValue,
// TODO: this should be unknown
// tslint:disable-next-line:no-any
>(value: any): value is JobHandler<A, I, O> {
  return typeof value == 'function'
      && typeof value.jobDescription == 'object'
      && value.jobDescription !== null;
}
