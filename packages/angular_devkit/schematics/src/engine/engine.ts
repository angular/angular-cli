/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, PriorityQueue, logging } from '@angular-devkit/core';
import { Observable, from as observableFrom } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { Url } from 'url';
import { MergeStrategy } from '../tree/interface';
import { NullTree } from '../tree/null';
import { empty } from '../tree/static';
import { Workflow } from '../workflow/interface';
import {
  Collection,
  CollectionDescription,
  Engine,
  EngineHost,
  ExecutionOptions,
  Schematic,
  SchematicContext,
  SchematicDescription,
  Source,
  TaskConfiguration,
  TaskConfigurationGenerator,
  TaskExecutor,
  TaskId,
  TaskInfo,
  TypedSchematicContext,
} from './interface';
import { SchematicImpl } from './schematic';


export class UnknownUrlSourceProtocol extends BaseException {
  constructor(url: string) { super(`Unknown Protocol on url "${url}".`); }
}

export class UnknownCollectionException extends BaseException {
  constructor(name: string) { super(`Unknown collection "${name}".`); }
}

export class CircularCollectionException extends BaseException {
  constructor(name: string) {
    super(`Circular collection reference "${name}".`);
  }
}

export class UnknownSchematicException extends BaseException {
  constructor(name: string, collection: CollectionDescription<{}>) {
    super(`Schematic "${name}" not found in collection "${collection.name}".`);
  }
}

export class PrivateSchematicException extends BaseException {
  constructor(name: string, collection: CollectionDescription<{}>) {
    super(`Schematic "${name}" not found in collection "${collection.name}".`);
  }
}

export class SchematicEngineConflictingException extends BaseException {
  constructor() { super(`A schematic was called from a different engine as its parent.`); }
}

export class UnregisteredTaskException extends BaseException {
  constructor(name: string, schematic?: SchematicDescription<{}, {}>) {
    const addendum = schematic ? ` in schematic "${schematic.name}"` : '';
    super(`Unregistered task "${name}"${addendum}.`);
  }
}

export class UnknownTaskDependencyException extends BaseException {
  constructor(id: TaskId) {
    super(`Unknown task dependency [ID: ${id.id}].`);
  }
}

export class CollectionImpl<CollectionT extends object, SchematicT extends object>
  implements Collection<CollectionT, SchematicT> {
  constructor(private _description: CollectionDescription<CollectionT>,
              private _engine: SchematicEngine<CollectionT, SchematicT>,
              public readonly baseDescriptions?: Array<CollectionDescription<CollectionT>>) {
  }

  get description() { return this._description; }
  get name() { return this.description.name || '<unknown>'; }

  createSchematic(name: string, allowPrivate = false): Schematic<CollectionT, SchematicT> {
    return this._engine.createSchematic(name, this, allowPrivate);
  }

  listSchematicNames(): string[] {
    return this._engine.listSchematicNames(this);
  }
}

export class TaskScheduler {
  private _queue = new PriorityQueue<TaskInfo>((x, y) => x.priority - y.priority);
  private _taskIds = new Map<TaskId, TaskInfo>();
  private static _taskIdCounter = 1;

  constructor(private _context: SchematicContext) {}

  private _calculatePriority(dependencies: Set<TaskInfo>): number {
    if (dependencies.size === 0) {
      return 0;
    }

    const prio = [...dependencies].reduce((prio, task) => prio + task.priority, 1);

    return prio;
  }

  private _mapDependencies(dependencies?: Array<TaskId>): Set<TaskInfo> {
    if (!dependencies) {
      return new Set();
    }

    const tasks = dependencies.map(dep => {
      const task = this._taskIds.get(dep);
      if (!task) {
        throw new UnknownTaskDependencyException(dep);
      }

      return task;
    });

    return new Set(tasks);
  }

  schedule<T>(taskConfiguration: TaskConfiguration<T>): TaskId {
    const dependencies = this._mapDependencies(taskConfiguration.dependencies);
    const priority = this._calculatePriority(dependencies);

    const task = {
      id: TaskScheduler._taskIdCounter++,
      priority,
      configuration: taskConfiguration,
      context: this._context,
    };

    this._queue.push(task);

    const id = { id: task.id };
    this._taskIds.set(id, task);

    return id;
  }

  finalize(): ReadonlyArray<TaskInfo> {
    const tasks = this._queue.toArray();
    this._queue.clear();
    this._taskIds.clear();

    return tasks;
  }

}


export class SchematicEngine<CollectionT extends object, SchematicT extends object>
    implements Engine<CollectionT, SchematicT> {

  private _collectionCache = new Map<string, CollectionImpl<CollectionT, SchematicT>>();
  private _schematicCache
    = new Map<string, Map<string, SchematicImpl<CollectionT, SchematicT>>>();
  private _taskSchedulers = new Array<TaskScheduler>();

  constructor(private _host: EngineHost<CollectionT, SchematicT>, protected _workflow?: Workflow) {
  }

  get workflow() { return this._workflow || null; }
  get defaultMergeStrategy() { return this._host.defaultMergeStrategy || MergeStrategy.Default; }

  createCollection(name: string): Collection<CollectionT, SchematicT> {
    let collection = this._collectionCache.get(name);
    if (collection) {
      return collection;
    }

    const [description, bases] = this._createCollectionDescription(name);

    collection = new CollectionImpl<CollectionT, SchematicT>(description, this, bases);
    this._collectionCache.set(name, collection);
    this._schematicCache.set(name, new Map());

    return collection;
  }

  private _createCollectionDescription(
    name: string,
    parentNames?: Set<string>,
  ): [CollectionDescription<CollectionT>, Array<CollectionDescription<CollectionT>>] {
    const description = this._host.createCollectionDescription(name);
    if (!description) {
      throw new UnknownCollectionException(name);
    }
    if (parentNames && parentNames.has(description.name)) {
      throw new CircularCollectionException(name);
    }

    const bases = new Array<CollectionDescription<CollectionT>>();
    if (description.extends) {
      parentNames = (parentNames || new Set<string>()).add(description.name);
      for (const baseName of description.extends) {
        const [base, baseBases] = this._createCollectionDescription(baseName, new Set(parentNames));

        bases.unshift(base, ...baseBases);
      }
    }

    return [description, bases];
  }

  createContext(
    schematic: Schematic<CollectionT, SchematicT>,
    parent?: Partial<TypedSchematicContext<CollectionT, SchematicT>>,
    executionOptions?: Partial<ExecutionOptions>,
  ): TypedSchematicContext<CollectionT, SchematicT> {
    // Check for inconsistencies.
    if (parent && parent.engine && parent.engine !== this) {
      throw new SchematicEngineConflictingException();
    }

    let interactive = true;
    if (executionOptions && executionOptions.interactive != undefined) {
      interactive = executionOptions.interactive;
    } else if (parent && parent.interactive != undefined) {
      interactive = parent.interactive;
    }

    let context: TypedSchematicContext<CollectionT, SchematicT> = {
      debug: parent && parent.debug || false,
      engine: this,
      logger: (parent && parent.logger && parent.logger.createChild(schematic.description.name))
              || new logging.NullLogger(),
      schematic,
      strategy: (parent && parent.strategy !== undefined)
        ? parent.strategy : this.defaultMergeStrategy,
      interactive,
      addTask,
    };

    const maybeNewContext = this._host.transformContext(context);
    if (maybeNewContext) {
      context = maybeNewContext;
    }

    const taskScheduler = new TaskScheduler(context);
    const host = this._host;
    this._taskSchedulers.push(taskScheduler);

    function addTask<T>(
      task: TaskConfigurationGenerator<T>,
      dependencies?: Array<TaskId>,
    ): TaskId {
      const config = task.toConfiguration();

      if (!host.hasTaskExecutor(config.name)) {
        throw new UnregisteredTaskException(config.name, schematic.description);
      }

      config.dependencies = config.dependencies || [];
      if (dependencies) {
        config.dependencies.unshift(...dependencies);
      }

      return taskScheduler.schedule(config);
    }

    return context;
  }

  createSchematic(
    name: string,
    collection: Collection<CollectionT, SchematicT>,
    allowPrivate = false,
  ): Schematic<CollectionT, SchematicT> {
    const collectionImpl = this._collectionCache.get(collection.description.name);
    const schematicMap = this._schematicCache.get(collection.description.name);
    if (!collectionImpl || !schematicMap || collectionImpl !== collection) {
      // This is weird, maybe the collection was created by another engine?
      throw new UnknownCollectionException(collection.description.name);
    }

    let schematic = schematicMap.get(name);
    if (schematic) {
      return schematic;
    }

    let collectionDescription = collection.description;
    let description = this._host.createSchematicDescription(name, collection.description);
    if (!description) {
      if (collection.baseDescriptions) {
        for (const base of collection.baseDescriptions) {
          description = this._host.createSchematicDescription(name, base);
          if (description) {
            collectionDescription = base;
            break;
          }
        }
      }
      if (!description) {
        // Report the error for the top level schematic collection
        throw new UnknownSchematicException(name, collection.description);
      }
    }

    if (description.private && !allowPrivate) {
      throw new PrivateSchematicException(name, collection.description);
    }

    const factory = this._host.getSchematicRuleFactory(description, collectionDescription);
    schematic = new SchematicImpl<CollectionT, SchematicT>(description, factory, collection, this);

    schematicMap.set(name, schematic);

    return schematic;
  }

  listSchematicNames(collection: Collection<CollectionT, SchematicT>): string[] {
    const names = this._host.listSchematicNames(collection.description);

    if (collection.baseDescriptions) {
      for (const base of collection.baseDescriptions) {
        names.push(...this._host.listSchematicNames(base));
      }
    }

    // remove duplicates
    return [...new Set(names)].sort();
  }

  transformOptions<OptionT extends object, ResultT extends object>(
    schematic: Schematic<CollectionT, SchematicT>,
    options: OptionT,
    context?: TypedSchematicContext<CollectionT, SchematicT>,
  ): Observable<ResultT> {
    return this._host.transformOptions<OptionT, ResultT>(schematic.description, options, context);
  }

  createSourceFromUrl(url: Url, context: TypedSchematicContext<CollectionT, SchematicT>): Source {
    switch (url.protocol) {
      case 'null:': return () => new NullTree();
      case 'empty:': return () => empty();
      default:
        const hostSource = this._host.createSourceFromUrl(url, context);
        if (!hostSource) {
          throw new UnknownUrlSourceProtocol(url.toString());
        }

        return hostSource;
    }
  }

  executePostTasks(): Observable<void> {
    const executors = new Map<string, TaskExecutor>();

    const taskObservable = observableFrom(this._taskSchedulers)
      .pipe(
        concatMap(scheduler => scheduler.finalize()),
        concatMap(task => {
          const { name, options } = task.configuration;

          const executor = executors.get(name);
          if (executor) {
            return executor(options, task.context);
          }

          return this._host.createTaskExecutor(name)
            .pipe(concatMap(executor => {
              executors.set(name, executor);

              return executor(options, task.context);
            }));
        }),
      );

    return taskObservable;
  }
}
