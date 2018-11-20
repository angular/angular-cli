/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { Observable, Observer, Subject, SubscriptionLike, isObservable } from 'rxjs';
import { JsonValue, schema } from '../json';
import { Logger, LoggerApi } from '../logger';
import { isPromise, mapObject } from '../utils';
import {
  JobEvent,
  JobEventKind,
  JobHandler,
  JobHandlerContext,
  JobInputKind,
  JobName,
} from './api';
import { RegisterJobOptions } from './simple-registry';


export interface SimpleJobHandlerContext extends JobHandlerContext {
  logger: LoggerApi;
  progress: (p: number) => void;
  channels: { [name: string]: Observer<JsonValue> };
  inputChannel: Observable<JsonValue>;
}


/**
 * A simple version of the JobHandler. This simplifies a lot of the interaction with the job
 * scheduler and registry. For example, instead of returning a JobEvent observable, you can
 * directly return an output.
 */
export type SimpleJobHandlerFn<I extends JsonValue, O extends JsonValue> = (
  input: I,
  context: SimpleJobHandlerContext,
) => O | Promise<O> | Observable<O>;


/**
 * A Job Handler with extra information associated with it.
 */
export interface JobHandlerWithExtra<
  InputT extends JsonValue,
  OutputT extends JsonValue,
> extends JobHandler<InputT, OutputT> {
  /**
   * The name of the job for the handler.
   */
  readonly jobName?: JobName;

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
}


export function renameJob<I extends JsonValue, O extends JsonValue>(
  handler: JobHandlerWithExtra<I, O>,
  options: RegisterJobOptions,
): JobHandlerWithExtra<I, O>;
export function renameJob<I extends JsonValue, O extends JsonValue>(
  handler: JobHandlerWithExtra<I, O>,
  options: RegisterJobOptions & { jobName: JobName },
): JobHandlerWithExtra<I, O> & { jobName: JobName };

/**
 * Allows you to override options of another job. This can be used to rename the job for example.
 * @param handler The other job.
 * @param options Additional information to add.
 */
export function renameJob<I extends JsonValue, O extends JsonValue>(
  handler: JobHandlerWithExtra<I, O>,
  options: RegisterJobOptions,
): JobHandlerWithExtra<I, O> {
  return Object.assign(handler, options);
}


export function createJob<I extends JsonValue, O extends JsonValue>(
  fn: SimpleJobHandlerFn<I, O>,
  options: Partial<RegisterJobOptions> & { jobName: JobName },
): JobHandlerWithExtra<I, O> & { jobName: JobName };
export function createJob<I extends JsonValue, O extends JsonValue>(
  fn: SimpleJobHandlerFn<I, O>,
  options?: Partial<RegisterJobOptions>,
): JobHandlerWithExtra<I, O>;

/**
 * Make a simple job handler that sets start, progress and end from a function that's synchronous
 * or does not report progress.
 *
 * @param fn The function to create a handler for.
 * @param options An optional set of properties to set on the handler. Some fields might be
 *   required by registry or schedulers.
 */
export function createJob<I extends JsonValue, O extends JsonValue>(
  fn: SimpleJobHandlerFn<I, O>,
  options: RegisterJobOptions = {},
): JobHandlerWithExtra<I, O> {
  const handler: JobHandlerWithExtra<I, O> = (input: I, context) => {
    const description = context.description;
    const inputStream = context.input;
    const inputChannel = new Subject<JsonValue>();
    let subscription: SubscriptionLike | null = null;

    return new Observable<JobEvent<O>>(subject => {
      subject.next({ kind: JobEventKind.Start, description });

      // Handle input.
      inputStream.subscribe(event => {
        switch (event.kind) {
          case JobInputKind.Ping:
            subject.next({ kind: JobEventKind.Pong, description });
            break;

          case JobInputKind.Stop:
            // There's no way to cancel a promise or a synchronous function, but we do cancel
            // observables where possible.
            if (subscription) {
              subscription.unsubscribe();
            }
            subject.complete();
            break;

          case JobInputKind.ChannelComplete:
            inputChannel.complete();
            break;
          case JobInputKind.ChannelError:
            inputChannel.error(event.error);
            break;
          case JobInputKind.ChannelMessage:
            inputChannel.next(event.message);
            break;
        }
      });

      // Configure a logger to pass in as additional context.
      const logger = new Logger('job');
      logger.subscribe(entry => {
        subject.next({
          kind: JobEventKind.Log,
          description,
          entry,
        });
      });

      function progress(progress: number) {
        subject.next({ kind: JobEventKind.Progress, description, progress });
      }

      // Execute the function with the additional context.
      subject.next({ kind: JobEventKind.Progress, description, progress: 0 });
      const result = fn(input, {
        ...context,
        channels: mapObject(context.description.channels, name => {
          const s = new Subject<JsonValue>();
          s.asObservable().subscribe(
            message => subject.next({
              kind: JobEventKind.ChannelMessage, description, message, name,
            }),
            error => subject.next({
              kind: JobEventKind.ChannelError, description, error, name,
            }),
            () => subject.next({
              kind: JobEventKind.ChannelComplete, description, name,
            }),
          );

          return s;
        }),
        inputChannel: inputChannel.asObservable(),
        logger,
        progress,
    });

      // If the result is a promise, simply wait for it to complete before reporting full progress
      // and the result.
      if (isPromise(result)) {
        result.then(result => {
          progress(1);
          subject.next({ kind: JobEventKind.Output, description, output: result });
          subject.next({ kind: JobEventKind.End, description });
          subject.complete();
        }, err => subject.error(err));
      } else if (isObservable(result)) {
        subscription = (result as Observable<O>).subscribe(
          (output: O) => subject.next({ kind: JobEventKind.Output, description, output }),
          error => subject.error(error),
          () => {
            progress(1);
            subject.next({ kind: JobEventKind.End, description });
            subject.complete();
          },
        );

        return subscription;
      } else {
        // If it's a scalar value, report it synchronously.
        progress(1);
        subject.next({ kind: JobEventKind.Output, description, output: result as O });
        subject.next({ kind: JobEventKind.End, description });
        subject.complete();
      }
    });
  };

  return Object.assign(handler, options);
}

export function lazyLoadJob<I extends JsonValue, O extends JsonValue>(
  loader: () => Promise<JobHandler<I, O>>,
  options: RegisterJobOptions,
): JobHandlerWithExtra<I, O>;
export function lazyLoadJob<I extends JsonValue, O extends JsonValue>(
  loader: () => Promise<JobHandler<I, O>>,
  options: RegisterJobOptions & { jobName: JobName },
): JobHandlerWithExtra<I, O> & { jobName: JobName };

/**
 * Lazily load a job.
 * @param loader A function that returns a promise of JobHandler.
 * @param options
 */
export function lazyLoadJob<I extends JsonValue, O extends JsonValue>(
  loader: () => Promise<JobHandler<I, O>>,
  options: RegisterJobOptions,
): JobHandlerWithExtra<I, O> {
  const handler: JobHandlerWithExtra<I, O> = (input, context) => {
    return new Observable<JobEvent<O>>(subject => {
      loader()
        .then(fn => fn(input, context).subscribe(subject))
        .catch(err => subject.error(err));
    });
  };

  return Object.assign(handler, options);
}
