/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging, schema, virtualFs } from '@angular-devkit/core';
import { EMPTY, Observable, Subject, concat, from, of, throwError } from 'rxjs';
import { concatMap, defaultIfEmpty, ignoreElements, last, map, tap } from 'rxjs/operators';
import { Engine, EngineHost, SchematicEngine } from '../engine';
import { UnsuccessfulWorkflowExecution } from '../exception/exception';
import { standardFormats } from '../formats';
import { DryRunEvent, DryRunSink } from '../sink/dryrun';
import { HostSink } from '../sink/host';
import { Sink } from '../sink/sink';
import { HostTree } from '../tree/host-tree';
import { Tree } from '../tree/interface';
import { optimize } from '../tree/static';
import {
  LifeCycleEvent,
  RequiredWorkflowExecutionContext,
  Workflow,
  WorkflowExecutionContext,
} from './interface';


export interface BaseWorkflowOptions {
  host: virtualFs.Host;
  engineHost: EngineHost<{}, {}>;
  registry?: schema.CoreSchemaRegistry;

  force?: boolean;
  dryRun?: boolean;
}

/**
 * Base class for workflows. Even without abstract methods, this class should not be used without
 * surrounding some initialization for the registry and host. This class only adds life cycle and
 * dryrun/force support. You need to provide any registry and task executors that you need to
 * support.
 * See {@see NodeWorkflow} implementation for how to make a specialized subclass of this.
 * TODO: add default set of CoreSchemaRegistry transforms. Once the job refactor is done, use that
 *       as the support for tasks.
 *
 * @public
 */
export abstract class BaseWorkflow implements Workflow {
  protected _engine: Engine<{}, {}>;
  protected _engineHost: EngineHost<{}, {}>;
  protected _registry: schema.CoreSchemaRegistry;

  protected _host: virtualFs.Host;

  protected _reporter: Subject<DryRunEvent> = new Subject();
  protected _lifeCycle: Subject<LifeCycleEvent> = new Subject();

  protected _context: WorkflowExecutionContext[];

  protected _force: boolean;
  protected _dryRun: boolean;

  constructor(options: BaseWorkflowOptions) {
    this._host = options.host;
    this._engineHost = options.engineHost;

    if (options.registry) {
      this._registry = options.registry;
    } else {
      this._registry = new schema.CoreSchemaRegistry(standardFormats);
      this._registry.addPostTransform(schema.transforms.addUndefinedDefaults);
    }

    this._engine = new SchematicEngine(this._engineHost, this);

    this._context = [];

    this._force = options.force || false;
    this._dryRun = options.dryRun || false;
  }

  get context(): Readonly<WorkflowExecutionContext> {
    const maybeContext = this._context[this._context.length - 1];
    if (!maybeContext) {
      throw new Error('Cannot get context when workflow is not executing...');
    }

    return maybeContext;
  }
  get engine(): Engine<{}, {}> {
    return this._engine;
  }
  get engineHost(): EngineHost<{}, {}> {
    return this._engineHost;
  }
  get registry(): schema.SchemaRegistry {
    return this._registry;
  }
  get reporter(): Observable<DryRunEvent> {
    return this._reporter.asObservable();
  }
  get lifeCycle(): Observable<LifeCycleEvent> {
    return this._lifeCycle.asObservable();
  }

  protected _createSinks(): Sink[] {
    let error = false;

    const dryRunSink = new DryRunSink(this._host, this._force);
    const dryRunSubscriber = dryRunSink.reporter.subscribe(event => {
      this._reporter.next(event);
      error = error || (event.kind == 'error');
    });

    // We need two sinks if we want to output what will happen, and actually do the work.
    return [
      dryRunSink,
      // Add a custom sink that clean ourselves and throws an error if an error happened.
      {
        commit() {
          dryRunSubscriber.unsubscribe();
          if (error) {
            return throwError(new UnsuccessfulWorkflowExecution());
          }

          return of();
        },
      },

      // Only add a HostSink if this is not a dryRun.
      ...(!this._dryRun ? [new HostSink(this._host, this._force)] : []),
    ];
  }

  execute(
    options: Partial<WorkflowExecutionContext> & RequiredWorkflowExecutionContext,
  ): Observable<void> {
    const parentContext = this._context[this._context.length - 1];

    if (!parentContext) {
      this._lifeCycle.next({ kind: 'start' });
    }

    /** Create the collection and the schematic. */
    const collection = this._engine.createCollection(options.collection);
    // Only allow private schematics if called from the same collection.
    const allowPrivate = options.allowPrivate
      || (parentContext && parentContext.collection === options.collection);
    const schematic = collection.createSchematic(options.schematic, allowPrivate);

    const sinks = this._createSinks();

    this._lifeCycle.next({ kind: 'workflow-start' });

    const context = {
      ...options,
      debug: options.debug || false,
      logger: options.logger || (parentContext && parentContext.logger) || new logging.NullLogger(),
      parentContext,
    };
    this._context.push(context);

    return schematic.call(
      options.options,
      of(new HostTree(this._host)),
      { logger: context.logger },
    ).pipe(
      map(tree => optimize(tree)),
      concatMap((tree: Tree) => {
        // Process all sinks.
        return concat(
          from(sinks).pipe(
            concatMap(sink => sink.commit(tree)),
            ignoreElements(),
          ),
          of(tree),
        );
      }),
      concatMap(() => {
        if (this._dryRun) {
          return EMPTY;
        }

        this._lifeCycle.next({ kind: 'post-tasks-start' });

        return this._engine.executePostTasks()
          .pipe(
            tap({ complete: () => this._lifeCycle.next({ kind: 'post-tasks-end' }) }),
            defaultIfEmpty(),
            last(),
          );
      }),
      tap({ complete: () => {
          this._lifeCycle.next({ kind: 'workflow-end' });
          this._context.pop();

          if (this._context.length == 0) {
            this._lifeCycle.next({ kind: 'end' });
          }
        }}),
    );
  }
}
