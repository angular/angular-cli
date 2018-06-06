/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, logging, schema, virtualFs } from '@angular-devkit/core';
import {
  DryRunSink,
  HostSink,
  HostTree,
  SchematicEngine,
  Tree,
  UnsuccessfulWorkflowExecution,
  formats,
  workflow,
} from '@angular-devkit/schematics';  // tslint:disable-line:no-implicit-dependencies
import { Observable, Subject, concat, of, throwError } from 'rxjs';
import { concatMap, defaultIfEmpty, ignoreElements, last, map, tap } from 'rxjs/operators';
import { DryRunEvent } from '../../src/sink/dryrun';
import { BuiltinTaskExecutor } from '../../tasks/node';
import { NodeModulesEngineHost } from '../node-module-engine-host';
import { validateOptionsWithSchema } from '../schema-option-transform';

export class NodeWorkflow implements workflow.Workflow {
  protected _engine: SchematicEngine<{}, {}>;
  protected _engineHost: NodeModulesEngineHost;
  protected _registry: schema.CoreSchemaRegistry;

  protected _reporter: Subject<DryRunEvent> = new Subject();
  protected _lifeCycle: Subject<workflow.LifeCycleEvent> = new Subject();

  protected _context: workflow.WorkflowExecutionContext[];

  constructor(
    protected _host: virtualFs.Host,
    protected _options: {
      force?: boolean;
      dryRun?: boolean;
      root?: Path,
      packageManager?: string;
    },
  ) {
    /**
     * Create the SchematicEngine, which is used by the Schematic library as callbacks to load a
     * Collection or a Schematic.
     */
    this._engineHost = new NodeModulesEngineHost();
    this._engine = new SchematicEngine(this._engineHost, this);

    // Add support for schemaJson.
    this._registry = new schema.CoreSchemaRegistry(formats.standardFormats);
    this._engineHost.registerOptionsTransform(validateOptionsWithSchema(this._registry));

    this._engineHost.registerTaskExecutor(
      BuiltinTaskExecutor.NodePackage,
      {
        allowPackageManagerOverride: true,
        packageManager: this._options.packageManager,
        rootDirectory: this._options.root,
      },
    );
    this._engineHost.registerTaskExecutor(
      BuiltinTaskExecutor.RepositoryInitializer,
      {
        rootDirectory: this._options.root,
      },
    );
    this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.RunSchematic);
    this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.TslintFix);

    this._context = [];
  }

  get context(): Readonly<workflow.WorkflowExecutionContext> {
    const maybeContext = this._context[this._context.length - 1];
    if (!maybeContext) {
      throw new Error('Cannot get context when workflow is not executing...');
    }

    return maybeContext;
  }
  get registry(): schema.SchemaRegistry {
    return this._registry;
  }
  get reporter(): Observable<DryRunEvent> {
    return this._reporter.asObservable();
  }
  get lifeCycle(): Observable<workflow.LifeCycleEvent> {
    return this._lifeCycle.asObservable();
  }

  execute(
    options: Partial<workflow.WorkflowExecutionContext> & workflow.RequiredWorkflowExecutionContext,
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

    // We need two sinks if we want to output what will happen, and actually do the work.
    // Note that fsSink is technically not used if `--dry-run` is passed, but creating the Sink
    // does not have any side effect.
    const dryRunSink = new DryRunSink(this._host, this._options.force);
    const fsSink = new HostSink(this._host, this._options.force);

    let error = false;
    const dryRunSubscriber = dryRunSink.reporter.subscribe(event => {
      this._reporter.next(event);
      error = error || (event.kind == 'error');
    });

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
      map(tree => Tree.optimize(tree)),
      concatMap((tree: Tree) => {
        return concat(
          dryRunSink.commit(tree).pipe(ignoreElements()),
          of(tree),
        );
      }),
      concatMap((tree: Tree) => {
        dryRunSubscriber.unsubscribe();
        if (error) {
          return throwError(new UnsuccessfulWorkflowExecution());
        }

        if (this._options.dryRun) {
          return of();
        }

        return fsSink.commit(tree).pipe(defaultIfEmpty(), last());
      }),
      concatMap(() => {
        if (this._options.dryRun) {
          return of();
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
