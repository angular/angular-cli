/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EMPTY, Observable, Observer, Subject, concat, of } from 'rxjs';
import {
  concatMap,
  filter,
  ignoreElements,
  last,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { JsonValue, schema } from '../json';
import { deepCopy } from '../utils';
import {
  Job,
  JobDescription,
  JobEvent,
  JobEventKind,
  JobEventOutput,
  JobHandler,
  JobHandlerContext,
  JobInput,
  JobInputKind,
  JobName,
  JobState,
  ScheduleJobOptions,
  Scheduler,
} from './api';
import { JobDoesNotExistException } from './exception';


export class JobInputSchemaValidationError extends schema.SchemaValidationException {
  constructor(errors?: schema.SchemaValidatorError[]) {
    super(errors, 'Job Input failed to validate. Errors: ');
  }
}
export class JobOutputSchemaValidationError extends schema.SchemaValidationException {
  constructor(errors?: schema.SchemaValidatorError[]) {
    super(errors, 'Job Output failed to validate. Errors: ');
  }
}


// Internal structure.
export interface SimpleSchedulerJobDescription {
  description: JobDescription;
  handler: JobHandler<JsonValue, JsonValue>;
  extends?: SimpleSchedulerJobDescription;
}


interface InternalJobDescription extends SimpleSchedulerJobDescription {
  inputV: Observable<schema.SchemaValidator>;
  outputV: Observable<schema.SchemaValidator>;
  extendsInternal: InternalJobDescription | null;
}


/**
 * Simple scheduler. Should be the base of all registries and schedulers.
 */
export abstract class SimpleScheduler<
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> implements Scheduler<MinimumInputValueT, MinimumOutputValueT> {
  private _internalJobDescriptionMap = new Map<JobName, InternalJobDescription | null>();
  private _queue: (() => void)[] = [];
  private _pauseCounter = 0;

  constructor(
    protected _schemaRegistry: schema.SchemaRegistry = new schema.CoreSchemaRegistry(),
  ) {}

  /**
   * The only method that needs to be overridden for this.
   * @param name
   * @private
   */
  protected abstract _createDescription(name: JobName): SimpleSchedulerJobDescription | null;

  private _getInternalDescription(name: JobName): InternalJobDescription | null {
    let maybeDescription = this._internalJobDescriptionMap.get(name);
    if (!maybeDescription) {
      const desc = this._createDescription(name);

      if (desc !== null) {
        maybeDescription = {
          ...desc,
          inputV: this._schemaRegistry.compile(desc.description.input).pipe(shareReplay()),
          outputV: this._schemaRegistry.compile(desc.description.output).pipe(shareReplay()),
          extendsInternal: desc.extends
            ? this._getInternalDescription(desc.extends.description.name) : null,
        };
      } else {
        maybeDescription = null;
      }
      this._internalJobDescriptionMap.set(name, maybeDescription);
    }

    return maybeDescription;
  }

  /**
   * Get a job description for a named job.
   *
   * @param name The name of the job.
   * @returns A description, or null if the job is not registered.
   */
  getDescription(name: JobName): JobDescription | null {
    const maybeDescription = this._getInternalDescription(name);

    return maybeDescription && maybeDescription.description;
  }

  /**
   * Returns true if the job name has been registered.
   * @param name The name of the job.
   * @returns True if the job exists, false otherwise.
   */
  has(name: JobName): boolean {
    return this._getInternalDescription(name) !== null;
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
   * @param input
   * @param options
   * @returns The Job being run.
   */
  schedule<I extends MinimumInputValueT, O extends MinimumOutputValueT>(
    name: JobName,
    input: I,
    options?: ScheduleJobOptions,
  ): Job<O> {
    if (this._pauseCounter > 0) {
      const waitable = new Subject<never>();
      this._queue.push(() => waitable.complete());

      return this._scheduleJob(name, input, options, waitable);
    }

    return this._scheduleJob(name, input, options);
  }

  protected _scheduleJob<I extends JsonValue, O extends JsonValue>(
    name: JobName,
    input: I,
    options?: ScheduleJobOptions,
    waitable: Observable<never> = EMPTY,
  ): Job<O> {
    const internalDesc = this._getInternalDescription(name);
    if (!internalDesc) {
      throw new JobDoesNotExistException(name);
    }

    const { description, handler, inputV, outputV } = internalDesc;
    const id: unique symbol = Symbol();
    const inputCopy = deepCopy(input);
    const optionsDeps = (options && options.dependencies) || [];
    const dependencies = Array.isArray(optionsDeps) ? optionsDeps : [optionsDeps];

    const channelsSubject: { [name: string]: Observer<JsonValue> } = {};
    const channels: { [name: string]: Observable<JsonValue> } = {};

    const inputChannel = new Subject<JobInput>();
    const inputMessageChannel = new Subject<JsonValue>();
    inputMessageChannel.subscribe(
      message => inputChannel.next({ kind: JobInputKind.ChannelMessage, message }),
      error => inputChannel.next({ kind: JobInputKind.ChannelError, error }),
      () => inputChannel.next({ kind: JobInputKind.ChannelComplete }),
    );

    Object.keys(description.channels)
      .forEach(channelName => {
        const subject = new Subject<JsonValue>();
        channelsSubject[channelName] = subject;
        channels[channelName] = subject.asObservable();
      });

    let state = JobState.Created;
    let progress = 0;

    // We create a proxy observable to make sure we queue the job on subscription.
    const outputChannel = concat(
      // Wait for pause() to clear (if necessary).
      waitable,

      // Wait for dependencies, make sure to not report events from dependencies.
      ...dependencies.map(x => x.outputChannel.pipe(ignoreElements())),

      // The main job. We wait until we're subscribed to before queueing the job. This makes every
      // job a cold Observable, by design.
      new Observable<JobEvent<O>>((subject: Observer<JobEvent<O>>) => {
        subject.next({ kind: JobEventKind.Create, description });

        // First off, validate the input.
        const subscription = inputV.pipe(
          switchMap(validate => {
            let result = validate(inputCopy);
            let currentExtend = internalDesc.extendsInternal;
            while (currentExtend) {
              const v = currentExtend.inputV;
              result = result.pipe(switchMap(x => {
                return x.success
                  ? v.pipe(switchMap(v => v(inputCopy)))
                  : of(x);
              }));
              currentExtend = currentExtend.extendsInternal;
            }

            return result;
          }),
          switchMap(output => {
            if (!output.success) {
              throw new JobInputSchemaValidationError(output.errors);
            }

            state = JobState.Queued;
            const context: JobHandlerContext<MinimumInputValueT, MinimumOutputValueT> = {
              description,
              dependencies,
              input: inputChannel.asObservable(),
              scheduler: this,
            };

            return handler(output.data, context).pipe(
              tap(event => {
                // Update the internal state.
                switch (event.kind) {
                  case JobEventKind.Log:
                    if (options && options.logger) {
                      options.logger.next(event.entry);
                    }
                    break;

                  case JobEventKind.Progress:
                    // Clamp between 0 and 1.
                    progress = Math.max(0, Math.min(1, event.progress));
                    break;
                  case JobEventKind.Start:
                    state = JobState.Started;
                    break;
                  case JobEventKind.End:
                    state = JobState.Ended;
                    break;

                  case JobEventKind.ChannelMessage:
                    if (event.name in channelsSubject) {
                      channelsSubject[event.name].next(event.message);
                    }
                    break;
                  case JobEventKind.ChannelComplete:
                    if (event.name in channelsSubject) {
                      channelsSubject[event.name].complete();
                    }
                    break;
                  case JobEventKind.ChannelError:
                    if (event.name in channelsSubject) {
                      channelsSubject[event.name].error(event.error);
                    }
                    break;
                }
              }),

              // Do output validation (might include default values so this might have side
              // effects). We keep all events in order.
              concatMap(event => {
                if (event.kind !== JobEventKind.Output) {
                  return of(event);
                }
                const outputCopy = deepCopy(event.output);

                return outputV.pipe(
                  switchMap(validate => {
                    let result = validate(outputCopy);
                    let currentExtend = internalDesc.extendsInternal;
                    while (currentExtend) {
                      const v = currentExtend.outputV;
                      result = result.pipe(
                        switchMap(x => {
                          if (x.success) {
                            return v.pipe(switchMap(v => v(x.data)));
                          } else {
                            return of(x);
                          }
                        }),
                      );
                      currentExtend = currentExtend.extendsInternal;
                    }

                    return result;
                  }),
                  switchMap(output => {
                    if (!output.success) {
                      throw new JobOutputSchemaValidationError(output.errors);
                    }

                    return of({
                      ...event,
                      output: output.data as O,
                    } as JobEventOutput<O>);
                  }),
                ) as Observable<JobEvent<O>>;
              }),
            );
          }),
        ).subscribe(subject);

        return () => subscription.unsubscribe();
      }).pipe(shareReplay()),
    );

    let promise: Promise<O> | null = null;
    const output = outputChannel.pipe(
      filter(x => x.kind == JobEventKind.Output),
      map((x: JobEventOutput<O>) => x.output),
    );

    // Return the Job.
    return {
      get progress() { return progress; },
      get promise() {
        // Cache the promise.
        if (!promise) {
          promise = output.pipe(last()).toPromise();
        }

        return promise;
      },
      get state() { return state; },
      id,
      description,
      output,
      channels,
      input: inputMessageChannel,
      inputChannel,
      outputChannel,
    };
  }

}
