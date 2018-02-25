/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging, schema, virtualFs } from '@angular-devkit/core';
import {
  DryRunSink,
  HostSink,
  HostTree,
  SchematicEngine,
  Sink,
  Tree,
  UnsuccessfulWorkflowExecution,
  formats,
  workflow,
} from '@angular-devkit/schematics';  // tslint:disable-line:no-implicit-dependencies
import { Observable } from 'rxjs/Observable';
import { empty } from 'rxjs/observable/empty';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { concat, concatMap, ignoreElements, map } from 'rxjs/operators';
import { NodeModulesEngineHost, validateOptionsWithSchema } from '..';
import { DryRunEvent } from '../../src/sink/dryrun';
import { BuiltinTaskExecutor } from '../../tasks/node';

export class NodeWorkflow implements workflow.Workflow {
  protected _engine: SchematicEngine<{}, {}>;
  protected _engineHost: NodeModulesEngineHost;

  protected _dryRunSink: DryRunSink;
  protected _fsSink: Sink;

  protected _context: workflow.WorkflowExecutionContext[];

  constructor(
    protected _host: virtualFs.Host,
    protected _options: {
      force?: boolean;
      dryRun?: boolean;
    },
  ) {
    /**
     * Create the SchematicEngine, which is used by the Schematic library as callbacks to load a
     * Collection or a Schematic.
     */
    this._engineHost = new NodeModulesEngineHost();
    this._engine = new SchematicEngine(this._engineHost);

    // Add support for schemaJson.
    const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
    this._engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));

    this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.NodePackage);
    this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.RepositoryInitializer);

    // We need two sinks if we want to output what will happen, and actually do the work.
    // Note that fsSink is technically not used if `--dry-run` is passed, but creating the Sink
    // does not have any side effect.
    this._dryRunSink = new DryRunSink(this._host, this._options.force);
    this._fsSink = new HostSink(this._host, this._options.force);

    this._context = [];
  }

  get context(): Readonly<workflow.WorkflowExecutionContext> {
    const maybeContext = this._context[this._context.length - 1];
    if (!maybeContext) {
      throw new Error('Cannot get context when workflow is not executing...');
    }

    return maybeContext;
  }
  get reporter(): Observable<DryRunEvent> {
    return this._dryRunSink.reporter;
  }

  execute(
    options: Partial<workflow.WorkflowExecutionContext> & workflow.RequiredWorkflowExecutionContext,
  ): Observable<void> {
    /** Create the collection and the schematic. */
    const collection = this._engine.createCollection(options.collection);
    const schematic = collection.createSchematic(options.schematic);

    let error = false;
    const dryRunSubscriber = this._dryRunSink.reporter.subscribe(event => {
      error = error || (event.kind == 'error');
    });

    const parentContext = this._context[this._context.length - 1];
    const context = {
      ...options,
      debug: options.debug || false,
      logger: options.logger || new logging.NullLogger(),
      parentContext,
    };
    this._context.push(context);

    return schematic.call(options.options, of(new HostTree(this._host)), {
      logger: options.logger || new logging.NullLogger(),
    }).pipe(
      map(tree => Tree.optimize(tree)),
      concatMap((tree: Tree) => {
        return this._dryRunSink.commit(tree).pipe(
          ignoreElements(),
          concat(of(tree)),
        );
      }),
      concatMap((tree: Tree) => {
        dryRunSubscriber.unsubscribe();
        if (error) {
          return _throw(new UnsuccessfulWorkflowExecution());
        }
        if (this._options.dryRun) {
          return empty<void>();
        }

        return this._fsSink.commit(tree);
      }),
      concat(new Observable<void>(obs => {
        if (!this._options.dryRun) {
          this._engine.executePostTasks().subscribe(obs);
        } else {
          obs.complete();
        }
      })),
      ignoreElements(),
      concat(new Observable(obs => {
        this._context.pop();

        obs.complete();
      })),
    );
  }
}
