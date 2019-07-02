/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  EMPTY,
  MonoTypeOperatorFunction,
  Observable,
  Observer,
  Subject,
  Subscription,
  concat,
  from,
  merge,
  of,
} from 'rxjs';
import {
  concatMap,
  filter,
  first,
  ignoreElements,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { JsonValue, schema } from '../../json';
import {
  Job,
  JobDescription,
  JobHandler,
  JobInboundMessage,
  JobInboundMessageKind,
  JobName,
  JobOutboundMessage,
  JobOutboundMessageKind,
  JobOutboundMessageOutput,
  JobState,
  Registry,
  ScheduleJobOptions,
  Scheduler,
} from './api';
import { JobDoesNotExistException } from './exception';


export class JobArgumentSchemaValidationError extends schema.SchemaValidationException {
  constructor(errors?: schema.SchemaValidatorError[]) {
    super(errors, 'Job Argument failed to validate. Errors: ');
  }
}
export class JobInboundMessageSchemaValidationError extends schema.SchemaValidationException {
  constructor(errors?: schema.SchemaValidatorError[]) {
    super(errors, 'Job Inbound Message failed to validate. Errors: ');
  }
}
export class JobOutputSchemaValidationError extends schema.SchemaValidationException {
  constructor(errors?: schema.SchemaValidatorError[]) {
    super(errors, 'Job Output failed to validate. Errors: ');
  }
}


interface JobHandlerWithExtra extends JobHandler<JsonValue, JsonValue, JsonValue> {
  jobDescription: JobDescription;

  argumentV: Observable<schema.SchemaValidator>;
  outputV: Observable<schema.SchemaValidator>;
  inputV: Observable<schema.SchemaValidator>;
}


function _jobShare<T>(): MonoTypeOperatorFunction<T> {
  // This is the same code as a `shareReplay()` operator, but uses a dumber Subject rather than a
  // ReplaySubject.
  return (source: Observable<T>): Observable<T> => {
    let refCount = 0;
    let subject: Subject<T>;
    let hasError = false;
    let isComplete = false;
    let subscription: Subscription;

    return new Observable<T>(subscriber => {
      let innerSub: Subscription;
      refCount++;
      if (!subject) {
        subject = new Subject<T>();

        innerSub = subject.subscribe(subscriber);
        subscription = source.subscribe({
          next(value) { subject.next(value); },
          error(err) {
            hasError = true;
            subject.error(err);
          },
          complete() {
            isComplete = true;
            subject.complete();
          },
        });
      } else {
        innerSub = subject.subscribe(subscriber);
      }

      return () => {
        refCount--;
        innerSub.unsubscribe();
        if (subscription && refCount === 0 && (isComplete || hasError)) {
          subscription.unsubscribe();
        }
      };
    });
  };
}


/**
 * Simple scheduler. Should be the base of all registries and schedulers.
 */
export class SimpleScheduler<
  MinimumArgumentT extends JsonValue = JsonValue,
  MinimumInputT extends JsonValue = JsonValue,
  MinimumOutputT extends JsonValue = JsonValue,
> implements Scheduler<MinimumArgumentT, MinimumInputT, MinimumOutputT> {
  private _internalJobDescriptionMap = new Map<JobName, JobHandlerWithExtra>();
  private _queue: (() => void)[] = [];
  private _pauseCounter = 0;

  constructor(
    protected _jobRegistry: Registry<MinimumArgumentT, MinimumInputT, MinimumOutputT>,
    protected _schemaRegistry: schema.SchemaRegistry = new schema.CoreSchemaRegistry(),
  ) {}

  private _getInternalDescription(name: JobName): Observable<JobHandlerWithExtra | null> {
    const maybeHandler = this._internalJobDescriptionMap.get(name);
    if (maybeHandler !== undefined) {
      return of(maybeHandler);
    }

    const handler = this._jobRegistry.get<MinimumArgumentT, MinimumInputT, MinimumOutputT>(name);

    return handler.pipe(
      switchMap(handler => {
        if (handler === null) {
          return of(null);
        }

        const description: JobDescription = {
          // Make a copy of it to be sure it's proper JSON.
          ...JSON.parse(JSON.stringify(handler.jobDescription)),
          name: handler.jobDescription.name || name,
          argument: handler.jobDescription.argument || true,
          input: handler.jobDescription.input || true,
          output: handler.jobDescription.output || true,
          channels: handler.jobDescription.channels || {},
        };

        const handlerWithExtra = Object.assign(handler.bind(undefined), {
          jobDescription: description,
          argumentV: this._schemaRegistry.compile(description.argument).pipe(shareReplay(1)),
          inputV: this._schemaRegistry.compile(description.input).pipe(shareReplay(1)),
          outputV: this._schemaRegistry.compile(description.output).pipe(shareReplay(1)),
        });
        this._internalJobDescriptionMap.set(name, handlerWithExtra);

        return of(handlerWithExtra);
      }),
    );
  }

  /**
   * Get a job description for a named job.
   *
   * @param name The name of the job.
   * @returns A description, or null if the job is not registered.
   */
  getDescription(name: JobName) {
    return concat(
      this._getInternalDescription(name).pipe(map(x => x && x.jobDescription)),
      of(null),
    ).pipe(
      first(),
    );
  }

  /**
   * Returns true if the job name has been registered.
   * @param name The name of the job.
   * @returns True if the job exists, false otherwise.
   */
  has(name: JobName) {
    return this.getDescription(name).pipe(
      map(x => x !== null),
    );
  }

  /**
   * Pause the scheduler, temporary queueing _new_ jobs. Returns a resume function that should be
   * used to resume execution. If multiple `pause()` were called, all their resume functions must
   * be called before the Scheduler actually starts new jobs. Additional calls to the same resume
   * function will have no effect.
   *
   * Jobs already running are NOT paused. This is pausing the scheduler only.
   */
  pause() {
    let called = false;
    this._pauseCounter++;

    return () => {
      if (!called) {
        called = true;
        if (--this._pauseCounter == 0) {
          // Resume the queue.
          const q = this._queue;
          this._queue = [];
          q.forEach(fn => fn());
        }
      }
    };
  }

  /**
   * Schedule a job to be run, using its name.
   * @param name The name of job to be run.
   * @param argument The argument to send to the job when starting it.
   * @param options Scheduling options.
   * @returns The Job being run.
   */
  schedule<A extends MinimumArgumentT, I extends MinimumInputT, O extends MinimumOutputT>(
    name: JobName,
    argument: A,
    options?: ScheduleJobOptions,
  ): Job<A, I, O> {
    if (this._pauseCounter > 0) {
      const waitable = new Subject<never>();
      this._queue.push(() => waitable.complete());

      return this._scheduleJob<A, I, O>(name, argument, options || {}, waitable);
    }

    return this._scheduleJob<A, I, O>(name, argument, options || {}, EMPTY);
  }

  /**
   * Filter messages.
   * @private
   */
  private _filterJobOutboundMessages<O extends MinimumOutputT>(
    message: JobOutboundMessage<O>,
    state: JobState,
  ) {
    switch (message.kind) {
      case JobOutboundMessageKind.OnReady:
        return state == JobState.Queued;
      case JobOutboundMessageKind.Start:
        return state == JobState.Ready;

      case JobOutboundMessageKind.End:
        return state == JobState.Started || state == JobState.Ready;
    }

    return true;
  }

  /**
   * Return a new state. This is just to simplify the reading of the _createJob method.
   * @private
   */
  private _updateState<O extends MinimumOutputT>(
    message: JobOutboundMessage<O>,
    state: JobState,
  ): JobState {
    switch (message.kind) {
      case JobOutboundMessageKind.OnReady:
        return JobState.Ready;
      case JobOutboundMessageKind.Start:
        return JobState.Started;
      case JobOutboundMessageKind.End:
        return JobState.Ended;
    }

    return state;
  }

  /**
   * Create the job.
   * @private
   */
  private _createJob<A extends MinimumArgumentT, I extends MinimumInputT, O extends MinimumOutputT>(
    name: JobName,
    argument: A,
    handler: Observable<JobHandlerWithExtra | null>,
    inboundBus: Observer<JobInboundMessage<I>>,
    outboundBus: Observable<JobOutboundMessage<O>>,
    options: ScheduleJobOptions,
  ): Job<A, I, O> {
    const schemaRegistry = this._schemaRegistry;

    const channelsSubject = new Map<string, Subject<JsonValue>>();
    const channels = new Map<string, Observable<JsonValue>>();

    let state = JobState.Queued;
    let pingId = 0;

    // Create the input channel by having a filter.
    const input = new Subject<JsonValue>();
    input.pipe(
      switchMap(message => handler.pipe(
        switchMap(handler => {
          if (handler === null) {
            throw new JobDoesNotExistException(name);
          } else {
            return handler.inputV.pipe(
              switchMap(validate => validate(message)),
            );
          }
        }),
      )),
      filter(result => result.success),
      map(result => result.data as I),
    ).subscribe(
      value => inboundBus.next({ kind: JobInboundMessageKind.Input, value }),
    );

    outboundBus = concat(
      outboundBus,
      // Add an End message at completion. This will be filtered out if the job actually send an
      // End.
      handler.pipe(switchMap(handler => {
        if (handler) {
          return of<JobOutboundMessage<O>>({
            kind: JobOutboundMessageKind.End, description: handler.jobDescription,
          });
        } else {
          return EMPTY as Observable<JobOutboundMessage<O>>;
        }
      })),
    ).pipe(
      filter(message => this._filterJobOutboundMessages(message, state)),
      // Update internal logic and Job<> members.
      tap(message => {
        // Update the state.
        state = this._updateState(message, state);

        switch (message.kind) {
          case JobOutboundMessageKind.ChannelCreate: {
            const maybeSubject = channelsSubject.get(message.name);
            // If it doesn't exist or it's closed on the other end.
            if (!maybeSubject) {
              const s = new Subject<JsonValue>();
              channelsSubject.set(message.name, s);
              channels.set(message.name, s.asObservable());
            }
            break;
          }

          case JobOutboundMessageKind.ChannelMessage: {
            const maybeSubject = channelsSubject.get(message.name);
            if (maybeSubject) {
              maybeSubject.next(message.message);
            }
            break;
          }

          case JobOutboundMessageKind.ChannelComplete: {
            const maybeSubject = channelsSubject.get(message.name);
            if (maybeSubject) {
              maybeSubject.complete();
              channelsSubject.delete(message.name);
            }
            break;
          }

          case JobOutboundMessageKind.ChannelError: {
            const maybeSubject = channelsSubject.get(message.name);
            if (maybeSubject) {
              maybeSubject.error(message.error);
              channelsSubject.delete(message.name);
            }
            break;
          }
        }
      }, () => {
        state = JobState.Errored;
      }),

      // Do output validation (might include default values so this might have side
      // effects). We keep all messages in order.
      concatMap(message => {
        if (message.kind !== JobOutboundMessageKind.Output) {
          return of(message);
        }

        return handler.pipe(
          switchMap(handler => {
            if (handler === null) {
              throw new JobDoesNotExistException(name);
            } else {
              return handler.outputV.pipe(
                switchMap(validate => validate(message.value)),
                switchMap(output => {
                  if (!output.success) {
                    throw new JobOutputSchemaValidationError(output.errors);
                  }

                  return of({
                    ...message,
                    output: output.data as O,
                  } as JobOutboundMessageOutput<O>);
                }),
              );
            }
          }),
        ) as Observable<JobOutboundMessage<O>>;
      }),
      _jobShare(),
    );

    const output = outboundBus.pipe(
      filter(x => x.kind == JobOutboundMessageKind.Output),
      map((x: JobOutboundMessageOutput<O>) => x.value),
      shareReplay(1),
    );

    // Return the Job.
    return {
      get state() { return state; },
      argument,
      description: handler.pipe(
        switchMap(handler => {
          if (handler === null) {
            throw new JobDoesNotExistException(name);
          } else {
            return of(handler.jobDescription);
          }
        }),
      ),
      output,
      getChannel<T extends JsonValue>(
        name: JobName,
        schema: schema.JsonSchema = true,
      ): Observable<T> {
        let maybeObservable = channels.get(name);
        if (!maybeObservable) {
          const s = new Subject<T>();
          channelsSubject.set(name, s);
          channels.set(name, s.asObservable());

          maybeObservable = s.asObservable();
        }

        return maybeObservable.pipe(
          // Keep the order of messages.
          concatMap(
            message => {
              return schemaRegistry.compile(schema).pipe(
                switchMap(validate => validate(message)),
                filter(x => x.success),
                map(x => x.data as T),
              );
            },
          ),
        );
      },
      ping() {
        const id = pingId++;
        inboundBus.next({ kind: JobInboundMessageKind.Ping, id });

        return outboundBus.pipe(
          filter(x => x.kind === JobOutboundMessageKind.Pong && x.id == id),
          first(),
          ignoreElements(),
        );
      },
      stop() {
        inboundBus.next({ kind: JobInboundMessageKind.Stop });
      },
      input,
      inboundBus,
      outboundBus,
    };
  }

  protected _scheduleJob<
    A extends MinimumArgumentT,
    I extends MinimumInputT,
    O extends MinimumOutputT,
  >(
    name: JobName,
    argument: A,
    options: ScheduleJobOptions,
    waitable: Observable<never>,
  ): Job<A, I, O> {
    // Get handler first, since this can error out if there's no handler for the job name.
    const handler = this._getInternalDescription(name);

    const optionsDeps = (options && options.dependencies) || [];
    const dependencies = Array.isArray(optionsDeps) ? optionsDeps : [optionsDeps];

    const inboundBus = new Subject<JobInboundMessage<I>>();
    const outboundBus = concat(
      // Wait for dependencies, make sure to not report messages from dependencies. Subscribe to
      // all dependencies at the same time so they run concurrently.
      merge(...dependencies.map(x => x.outboundBus)).pipe(ignoreElements()),

      // Wait for pause() to clear (if necessary).
      waitable,

      from(handler).pipe(
        switchMap(handler => new Observable<JobOutboundMessage<O>>(
                      (subscriber: Observer<JobOutboundMessage<O>>) => {
          if (!handler) {
            throw new JobDoesNotExistException(name);
          }

          // Validate the argument.
          return handler.argumentV.pipe(
            switchMap(validate => validate(argument)),
            switchMap(output => {
              if (!output.success) {
                throw new JobArgumentSchemaValidationError(output.errors);
              }

              const argument: A = output.data as A;
              const description = handler.jobDescription;
              subscriber.next({ kind: JobOutboundMessageKind.OnReady, description });

              const context = {
                description,
                dependencies: [...dependencies],
                inboundBus: inboundBus.asObservable(),
                scheduler: this as Scheduler<MinimumArgumentT, MinimumInputT, MinimumOutputT>,
              };

              return handler(argument, context);
            }),
          ).subscribe(subscriber);
        })),
      ),
    );

    return this._createJob(name, argument, handler, inboundBus, outboundBus, options);
  }
}
