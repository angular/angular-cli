/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, logging } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { from as observableFrom } from 'rxjs/observable/from';
import { concatMap } from 'rxjs/operators';
import { Url } from 'url';
import { MergeStrategy } from '../tree/interface';
import { NullTree } from '../tree/null';
import { empty } from '../tree/static';
import { CollectionImpl } from './collection';
import {
  Collection,
  CollectionDescription,
  Engine,
  EngineHost,
  Schematic,
  SchematicDescription,
  Source,
  TypedSchematicContext,
} from './interface';
import { SchematicImpl } from './schematic';
import {
  TaskConfigurationGenerator,
  TaskExecutor,
  TaskId,
  TaskScheduler,
} from './task';


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

export class SchematicEngine<CollectionT extends object, SchematicT extends object>
    implements Engine<CollectionT, SchematicT> {

  private _collectionCache = new Map<string, CollectionImpl<CollectionT, SchematicT>>();
  private _schematicCache
    = new Map<string, Map<string, SchematicImpl<CollectionT, SchematicT>>>();
  private _taskSchedulers = new Array<TaskScheduler>();

  constructor(private _host: EngineHost<CollectionT, SchematicT>) {
  }

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
  ): TypedSchematicContext<CollectionT, SchematicT> {
    // Check for inconsistencies.
    if (parent && parent.engine && parent.engine !== this) {
      throw new SchematicEngineConflictingException();
    }

    const context = {
      debug: parent && parent.debug || false,
      engine: this,
      logger: (parent && parent.logger && parent.logger.createChild(schematic.description.name))
              || new logging.NullLogger(),
      schematic,
      strategy: (parent && parent.strategy !== undefined)
        ? parent.strategy : this.defaultMergeStrategy,
      addTask,
    };

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
    return [...new Set(names)];
  }

  transformOptions<OptionT extends object, ResultT extends object>(
    schematic: Schematic<CollectionT, SchematicT>,
    options: OptionT,
  ): Observable<ResultT> {
    return this._host.transformOptions<OptionT, ResultT>(schematic.description, options);
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
