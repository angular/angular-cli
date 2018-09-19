/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, concat, of } from 'rxjs';
import {
  filter,
  ignoreElements,
  last,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { UnknownException } from '../exception';
import { JsonValue, schema } from '../json';
import { stableStringify } from '../json/stringify';
import { deepCopy } from '../utils/object';
import {
  Job,
  JobDescription,
  JobEvent,
  JobEventEnd,
  JobEventKind,
  JobEventResult,
  JobHandler,
  JobName,
  JobRegistry, JobState,
  JobStrategy,
  JobTypeDescription,
  JobTypeName,
  RegisterJobOptions,
  ScheduleJobOptions,
} from './api';
import {
  DefaultJobForTypeDoesNotExistException,
  JobDoesNotExistException, JobHandlerIsOfInvalidTypeException,
  JobNameAlreadyRegisteredException,
  JobTypeDoesNotExistException,
} from './exception';


interface InternalJobDescription {
  description: JobDescription;
  validator: Observable<schema.SchemaValidator>;
  // TODO: replace this any for unknown.
  // tslint:disable-next-line:no-any
  executor: JobStrategyExecutor<any, any>;
}

abstract class JobStrategyExecutor<I extends JsonValue, O extends JsonValue> {
  constructor(protected _registry: JobRegistry, protected handler: JobHandler<I, O>) {}

  abstract queue(
    id: symbol,
    description: JobDescription,
    input: I,
    dependencies: Job<{}>[],
  ): Observable<JobEvent<O>>;
}


/**
 * An executor that runs every Job queued to it immediately.
 */
class JobStrategyParallelExecutor<
  I extends JsonValue,
  O extends JsonValue,
> extends JobStrategyExecutor<I, O> {
  queue(id: symbol, description: JobDescription, input: I, dependencies: Job<{}>[]) {
    const scheduler = this._registry;

    return this.handler(input, { description, scheduler, dependencies });
  }
}


/**
 * An executor that will wait for the last job to be done before running a new job. This is the
 * default setting for jobs.
 */
class JobStrategySerialExecutor<
  I extends JsonValue,
  O extends JsonValue,
> extends JobStrategyExecutor<I, O> {
  private _latest: Observable<JobEvent<O>> = of();

  queue(id: symbol, description: JobDescription, input: I, dependencies: Job<{}>[]) {
    const latest = this._latest;
    const handler = this.handler;
    const scheduler = this._registry;

    this._latest = new Observable<JobEvent<O>>(subject => {
      latest.subscribe({
        complete() {
          handler(input, { description, scheduler, dependencies }).subscribe(subject);
        },
      });
    }).pipe(
      // We use shareReplay here to prevent the above subscription from rerunning the Observable.
      shareReplay(),
    );

    return this._latest;
  }
}


/**
 * An executor that reuses a job if it is already running, otherwise starts it.
 */
class JobStrategyReuseExecutor<
  I extends JsonValue,
  O extends JsonValue,
> extends JobStrategyExecutor<I, O> {
  private _latest: Observable<JobEvent<O>> | null = null;

  queue(id: symbol, description: JobDescription, input: I, dependencies: Job<{}>[]) {
    const scheduler = this._registry;

    if (this._latest === null) {
      this._latest = this.handler(input, { description, scheduler, dependencies }).pipe(
        shareReplay(),
        // Reset the job after completion.
        tap(undefined, undefined, () => this._latest = null),
      );
    }

    return this._latest;
  }
}


/**
 * An executor that runs a job only once, and always return the same result.
 */
class JobStrategyOnceExecutor<
  I extends JsonValue,
  O extends JsonValue,
> extends JobStrategyExecutor<I, O> {
  private _once: Observable<JobEvent<O>> | null = null;

  queue(id: symbol, description: JobDescription, input: I, dependencies: Job<{}>[]) {
    const scheduler = this._registry;

    if (this._once === null) {
      this._once = this.handler(input, { description, scheduler, dependencies: [] }).pipe(
        shareReplay(),
      );
    }

    return this._once;
  }
}


/**
 * An executor that reuses a job when the inputs are the same.
 */
class JobStrategyMemoizeExecutor<
  I extends JsonValue,
  O extends JsonValue,
> extends JobStrategyExecutor<I, O> {
  private _runs = new Map<string, Observable<JobEvent<O>>>();

  queue(id: symbol, description: JobDescription, input: I, dependencies: Job<{}>[]) {
    const inputJson = stableStringify(input);
    const maybeJob = this._runs.get(inputJson);
    const scheduler = this._registry;

    if (maybeJob) {
      return maybeJob;
    }

    const job = this.handler(input, { description, scheduler, dependencies }).pipe(
      shareReplay(),
    );

    this._runs.set(inputJson, job);

    return job;
  }
}


interface JobStrategyExecutorConstructor {
  // TODO: replace this any for unknown.
  // tslint:disable-next-line:no-any
  new (registry: JobRegistry, handler: JobHandler<any, any>): JobStrategyExecutor<any, any>;
}


const STRATEGY_ENFORCER_MAP: { [s: number]: JobStrategyExecutorConstructor } = {
  [JobStrategy.Serialize]: JobStrategySerialExecutor,
  [JobStrategy.Parallelize]: JobStrategyParallelExecutor,
  [JobStrategy.Reuse]: JobStrategyReuseExecutor,
  [JobStrategy.Once]: JobStrategyOnceExecutor,
  [JobStrategy.Memoize]: JobStrategyMemoizeExecutor,
};


/**
 * A simple job registry that executes jobs in the current process as they come.
 */
export class SimpleJobRegistry implements JobRegistry {
  private _jobTypes = new Map<JobTypeName, JobTypeDescription>();
  private _jobNames = new Map<JobName, InternalJobDescription>();
  private _defaultJobNames = new Map<JobTypeName, JobName>();

  private _running = new Map<symbol, Job<{}>>();

  constructor(private _schemaRegistry = new schema.CoreSchemaRegistry()) {}

  getDescription(name: JobName): JobDescription | null {
    const maybeDescription = this._jobNames.get(name);

    return maybeDescription ? maybeDescription.description : null;
  }

  getTypeDescription(type: JobTypeName): JobTypeDescription | null {
    return this._jobTypes.get(type) || null;
  }

  has(name: JobName): boolean {
    return this._jobNames.has(name);
  }

  hasType(type: JobTypeName): boolean {
    return this._jobTypes.has(type);
  }

  register<InputT extends JsonValue, OutputT extends JsonValue>(
    name: JobName,
    type: JobTypeName,
    handler: JobHandler<InputT, OutputT>,
    options?: RegisterJobOptions,
  ): void {
    const maybeTypeDescription = this.getTypeDescription(type);
    if (!maybeTypeDescription) {
      throw new JobTypeDoesNotExistException(type);
    }

    const maybeJob = this.getDescription(name);
    if (maybeJob) {
      // We shouldn't allow conflicts.
      throw new JobNameAlreadyRegisteredException(name);
    }

    let input = maybeTypeDescription.input;
    if (options && options.input !== undefined) {
      // TODO: check that input is a superset of the type's input.
      input = deepCopy(options.input);
    }

    let output = maybeTypeDescription.output;
    if (options && options.output !== undefined) {
      // TODO: check that output is a superset of the type's output.
      output = deepCopy(options.output);
    }

    // Set default values for priority and strategy.
    const priority = options && options.priority !== undefined ? options.priority : 0;
    const strategy = options && options.strategy !== undefined
      ? options.strategy : JobStrategy.Default;
    const EnforcerClass = STRATEGY_ENFORCER_MAP[strategy]
      || STRATEGY_ENFORCER_MAP[JobStrategy.Default];

    // Create the job description.
    const description: JobDescription = {
      name,
      strategy,
      priority,
      type: maybeTypeDescription,
      input,
      output,
    };

    this._jobNames.set(name, {
      description,
      validator: this._schemaRegistry.compile(input).pipe(
        shareReplay(),
      ),
      executor: new EnforcerClass(this, handler),
    });

    const maybeDefaultJob = this._defaultJobNames.get(type);
    if (maybeDefaultJob) {
      const defaultJob = this._jobNames.get(maybeDefaultJob);
      if (!defaultJob) {
        throw new UnknownException('This should not happen.');
      }

      // We found a default job already, check if we need to overwrite it.
      if (priority >= defaultJob.description.priority) {
        this._defaultJobNames.set(type, name);
      }
    } else {
      this._defaultJobNames.set(type, name);
    }
  }

  registerType(
    type: JobTypeName,
    input: schema.JsonSchema,
    output: schema.JsonSchema,
  ): void {
    const maybeTypeDescription = this.getTypeDescription(type);
    if (maybeTypeDescription) {
      // TODO: verify that the type is compatible.
      return;
    }

    const description: JobTypeDescription = {
      type,
      input: deepCopy(input),
      output: deepCopy(output),
    };

    this._jobTypes.set(type, description);
  }

  setDefaultJobHandlerForType(type: JobTypeName, name: JobName | null): void {
    const maybeTypeDescription = this.getTypeDescription(type);
    if (!maybeTypeDescription) {
      throw new JobTypeDoesNotExistException(type);
    }

    if (name === null) {
      this._defaultJobNames.delete(maybeTypeDescription.type);

      return;
    }

    const internalDesc = this._jobNames.get(name);
    if (!internalDesc) {
      throw new JobDoesNotExistException(name);
    }

    if (internalDesc.description.type !== maybeTypeDescription) {
      throw new JobHandlerIsOfInvalidTypeException(name, type);
    }

    this._defaultJobNames.set(type, name);
  }

  schedule<I extends JsonValue, O extends JsonValue>(
    type: JobTypeName,
    input: I,
    options?: ScheduleJobOptions,
  ): Job<O> {
    const maybeTypeDescription = this.getTypeDescription(type);
    if (!maybeTypeDescription) {
      throw new JobTypeDoesNotExistException(type);
    }

    const maybeJobName = this._defaultJobNames.get(type);
    if (!maybeJobName) {
      throw new DefaultJobForTypeDoesNotExistException(type);
    }

    return this.scheduleJobByName(maybeJobName, input, options);
  }

  scheduleJobByName<I extends JsonValue, O extends JsonValue>(
    name: JobName,
    input: I,
    options?: ScheduleJobOptions,
  ): Job<O> {
    const internalDesc = this._jobNames.get(name);
    if (!internalDesc) {
      throw new JobDoesNotExistException(name);
    }

    const { description, executor, validator } = internalDesc;
    const id: unique symbol = Symbol();
    const inputCopy = deepCopy(input);
    const optionsDeps = (options && options.dependencies) || [];
    const dependencies = Array.isArray(optionsDeps) ? optionsDeps : [optionsDeps];

    let state = JobState.Created;
    let progress = 0;

    // We create a proxy observable to make sure we queue the job on subscription.
    const event = concat(
      // Make sure to not report events from dependencies.
      ...dependencies.map(x => x.pipe(ignoreElements())),

      // The main job. We wait until we're subscribed to before queueing the job. This makes every
      // job a cold Observable, by design.
      new Observable<JobEvent<O>>(subject => {
        subject.next({ kind: JobEventKind.Create, description });

        // First off, validate the input.
        const subscription = validator.pipe(
          switchMap(validate => validate(inputCopy)),
          switchMap(result => {
            state = JobState.Queued;
            subject.next({ kind: JobEventKind.Queue, description });

            return executor.queue(id, description, result.data, dependencies).pipe(
              tap(event => {
                switch (event.kind) {
                  case JobEventKind.Progress:
                    progress = event.progress;
                    break;
                  case JobEventKind.Start:
                    state = JobState.Started;
                    break;
                  case JobEventKind.End:
                    state = JobState.Ended;
                    break;
                }
              }),
            );
          }),
        ).subscribe(subject);

        return () => subscription.unsubscribe();
      }).pipe(shareReplay()),
    );

    // Create the job itself by extending the event observable.
    const job = Object.assign(event, { id, description }) as Job<O>;

    let promise: Promise<O> | null = null;
    Object.defineProperties(job, {
      output: {
        get() {
          if (!promise) {
            promise = event.pipe(
              filter(x => x.kind == JobEventKind.Result),
              map((x: JobEventResult<O>) => x.output),
              last(),
            ).toPromise();
          }

          return promise;
        },
      },
      progress: {
        get() {
          return progress;
        },
      },
      state: {
        get() {
          return state;
        },
      },
    });

    return job;
  }
}
