/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { Observable, Observer, Subject, Subscription, from, isObservable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { BaseException } from '../../exception/index';
import { JsonValue } from '../../json/index';
import { LoggerApi } from '../../logger';
import { isPromise } from '../../utils/index';
import {
  JobDescription,
  JobHandler,
  JobHandlerContext,
  JobInboundMessageKind,
  JobOutboundMessage,
  JobOutboundMessageKind,
} from './api';


export class ChannelAlreadyExistException extends BaseException {
  constructor(name: string) {
    super(`Channel ${JSON.stringify(name)} already exist.`);
  }
}

/**
 * Interface for the JobHandler context that is used when using `createJobHandler()`. It extends
 * the basic `JobHandlerContext` with additional functionality.
 */
export interface SimpleJobHandlerContext<
  A extends JsonValue,
  I extends JsonValue,
  O extends JsonValue,
> extends JobHandlerContext<A, I, O> {
  createChannel: (name: string) => Observer<JsonValue>;
  input: Observable<I>;
}


/**
 * A simple version of the JobHandler. This simplifies a lot of the interaction with the job
 * scheduler and registry. For example, instead of returning a JobOutboundMessage observable, you
 * can directly return an output.
 */
export type SimpleJobHandlerFn<A extends JsonValue, I extends JsonValue, O extends JsonValue> = (
  input: A,
  context: SimpleJobHandlerContext<A, I, O>,
) => O | Promise<O> | Observable<O>;


/**
 * Make a simple job handler that sets start and end from a function that's synchronous.
 *
 * @param fn The function to create a handler for.
 * @param options An optional set of properties to set on the handler. Some fields might be
 *   required by registry or schedulers.
 */
export function createJobHandler<A extends JsonValue, I extends JsonValue, O extends JsonValue>(
  fn: SimpleJobHandlerFn<A, I, O>,
  options: Partial<JobDescription> = {},
): JobHandler<A, I, O> {
  const handler = (argument: A, context: JobHandlerContext<A, I, O>) => {
    const description = context.description;
    const inboundBus = context.inboundBus;
    const inputChannel = new Subject<I>();
    let subscription: Subscription;

    return new Observable<JobOutboundMessage<O>>(subject => {
      function complete() {
        if (subscription) {
          subscription.unsubscribe();
        }
        subject.next({ kind: JobOutboundMessageKind.End, description });
        subject.complete();
        inputChannel.complete();
      }

      // Handle input.
      const inboundSub = inboundBus.subscribe(message => {
        switch (message.kind) {
          case JobInboundMessageKind.Ping:
            subject.next({ kind: JobOutboundMessageKind.Pong, description, id: message.id });
            break;

          case JobInboundMessageKind.Stop:
            // There's no way to cancel a promise or a synchronous function, but we do cancel
            // observables where possible.
            complete();
            break;

          case JobInboundMessageKind.Input:
            inputChannel.next(message.value);
            break;
        }
      });

      // Execute the function with the additional context.
      const channels = new Map<string, Subject<JsonValue>>();

      const newContext: SimpleJobHandlerContext<A, I, O> = {
        ...context,
        input: inputChannel.asObservable(),
        createChannel(name: string) {
          if (channels.has(name)) {
            throw new ChannelAlreadyExistException(name);
          }
          const channelSubject = new Subject<JsonValue>();
          const channelSub = channelSubject.subscribe(
            message => {
              subject.next({
                kind: JobOutboundMessageKind.ChannelMessage, description, name, message,
              });
            },
            error => {
              subject.next({ kind: JobOutboundMessageKind.ChannelError, description, name, error });
              // This can be reopened.
              channels.delete(name);
            },
            () => {
              subject.next({ kind: JobOutboundMessageKind.ChannelComplete, description, name });
              // This can be reopened.
              channels.delete(name);
            },
          );

          channels.set(name, channelSubject);
          if (subscription) {
            subscription.add(channelSub);
          }

          return channelSubject;
        },
      };

      subject.next({ kind: JobOutboundMessageKind.Start, description });
      let result = fn(argument, newContext);
      // If the result is a promise, simply wait for it to complete before reporting the result.
      if (isPromise(result)) {
        result = from(result);
      } else if (!isObservable(result)) {
        result = of(result as O);
      }

      subscription = (result as Observable<O>).subscribe(
        (value: O) => subject.next({ kind: JobOutboundMessageKind.Output, description, value }),
        error => subject.error(error),
        () => complete(),
      );
      subscription.add(inboundSub);

      return subscription;
    });
  };

  return Object.assign(handler, { jobDescription: options });
}


/**
 * Lazily create a job using a function.
 * @param loader A factory function that returns a promise/observable of a JobHandler.
 * @param options Same options as createJob.
 */
export function createJobFactory<A extends JsonValue, I extends JsonValue, O extends JsonValue>(
  loader: () => Promise<JobHandler<A, I, O>>,
  options: Partial<JobDescription> = {},
): JobHandler<A, I, O> {
  const handler = (argument: A, context: JobHandlerContext<A, I, O>) => {
    return from(loader())
      .pipe(switchMap(fn => fn(argument, context)));
  };

  return Object.assign(handler, { jobDescription: options });
}


/**
 * Creates a job that logs out input/output messages of another Job. The messages are still
 * propagated to the other job.
 */
export function createLoggerJob<A extends JsonValue, I extends JsonValue, O extends JsonValue>(
  job: JobHandler<A, I, O>,
  logger: LoggerApi,
): JobHandler<A, I, O> {
  const handler = (argument: A, context: JobHandlerContext<A, I, O>) => {
    context.inboundBus.pipe(
      tap(message => logger.info(`Input: ${JSON.stringify(message)}`)),
    ).subscribe();

    return job(argument, context).pipe(
      tap(
        message => logger.info(`Message: ${JSON.stringify(message)}`),
        error => logger.warn(`Error: ${JSON.stringify(error)}`),
        () => logger.info(`Completed`),
      ),
    );
  };

  return Object.assign(handler, job);
}
