/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging, schema } from '@angular-devkit/core';
import { Observable, of as observableOf } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Collection,
  DelegateTree,
  HostTree,
  Rule,
  Schematic,
  SchematicContext,
  SchematicEngine,
  TaskConfiguration,
  Tree,
  formats,
} from '../src';
import { callRule } from '../src/rules/call';
import { BuiltinTaskExecutor } from '../tasks/node';
import {
  NodeModulesTestEngineHost,
  validateOptionsWithSchema,
} from '../tools';


export class UnitTestTree extends DelegateTree {
  get files() {
    const result: string[] = [];
    this.visit(path => result.push(path));

    return result;
  }

  readContent(path: string): string {
    const buffer = this.read(path);
    if (buffer === null) {
      return '';
    }

    return buffer.toString();
  }
}

export class SchematicTestRunner {
  private _engineHost = new NodeModulesTestEngineHost();
  private _engine: SchematicEngine<{}, {}> = new SchematicEngine(this._engineHost);
  private _collection: Collection<{}, {}>;
  private _logger: logging.Logger;

  constructor(private _collectionName: string, collectionPath: string) {
    this._engineHost.registerCollection(_collectionName, collectionPath);
    this._logger = new logging.Logger('test');

    const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    this._engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));
    this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.NodePackage);
    this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.RepositoryInitializer);
    this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.RunSchematic);
    this._engineHost.registerTaskExecutor(BuiltinTaskExecutor.TslintFix);

    this._collection = this._engine.createCollection(this._collectionName);
  }

  get engine() { return this._engine; }
  get logger(): logging.Logger { return this._logger; }
  get tasks(): TaskConfiguration[] { return [...this._engineHost.tasks]; }

  registerCollection(collectionName: string, collectionPath: string) {
    this._engineHost.registerCollection(collectionName, collectionPath);
  }

  runSchematicAsync<SchematicSchemaT>(
    schematicName: string,
    opts?: SchematicSchemaT,
    tree?: Tree,
  ): Observable<UnitTestTree> {
    const schematic = this._collection.createSchematic(schematicName, true);
    const host = observableOf(tree || new HostTree);
    this._engineHost.clearTasks();

    return schematic.call(opts || {}, host, { logger: this._logger })
      .pipe(map(tree => new UnitTestTree(tree)));
  }

  /**
   * @deprecated Since v8.0.0 - Use {@link SchematicTestRunner.runSchematicAsync} instead.
   * All schematics can potentially be async.
   * This synchronous variant will fail if the schematic, any of its rules, or any schematics
   * it calls are async.
   */
  runSchematic<SchematicSchemaT>(
    schematicName: string,
    opts?: SchematicSchemaT,
    tree?: Tree,
  ): UnitTestTree {
    const schematic = this._collection.createSchematic(schematicName, true);

    let result: UnitTestTree | null = null;
    let error;
    const host = observableOf(tree || new HostTree);
    this._engineHost.clearTasks();

    schematic.call(opts || {}, host, { logger: this._logger })
      .subscribe(t => result = new UnitTestTree(t), e => error = e);

    if (error) {
      throw error;
    }

    if (result === null) {
      throw new Error('Schematic is async, please use runSchematicAsync');
    }

    return result;
  }

  runExternalSchematicAsync<SchematicSchemaT>(
    collectionName: string,
    schematicName: string,
    opts?: SchematicSchemaT,
    tree?: Tree,
  ): Observable<UnitTestTree> {
    const externalCollection = this._engine.createCollection(collectionName);
    const schematic = externalCollection.createSchematic(schematicName, true);
    const host = observableOf(tree || new HostTree);
    this._engineHost.clearTasks();

    return schematic.call(opts || {}, host, { logger: this._logger })
      .pipe(map(tree => new UnitTestTree(tree)));
  }

  /**
   * @deprecated Since v8.0.0 - Use {@link SchematicTestRunner.runExternalSchematicAsync} instead.
   * All schematics can potentially be async.
   * This synchronous variant will fail if the schematic, any of its rules, or any schematics
   * it calls are async.
   */
  runExternalSchematic<SchematicSchemaT>(
    collectionName: string,
    schematicName: string,
    opts?: SchematicSchemaT,
    tree?: Tree,
  ): UnitTestTree {
    const externalCollection = this._engine.createCollection(collectionName);
    const schematic = externalCollection.createSchematic(schematicName, true);

    let result: UnitTestTree | null = null;
    const host = observableOf(tree || new HostTree);
    this._engineHost.clearTasks();

    schematic.call(opts || {}, host, { logger: this._logger })
      .subscribe(t => result = new UnitTestTree(t));

    if (result === null) {
      throw new Error('Schematic is async, please use runSchematicAsync');
    }

    return result;
  }

  callRule(rule: Rule, tree: Tree, parentContext?: Partial<SchematicContext>): Observable<Tree> {
    const context = this._engine.createContext({} as Schematic<{}, {}>, parentContext);

    return callRule(rule, observableOf(tree), context);
  }
}
