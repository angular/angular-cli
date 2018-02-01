/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging, schema } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { of as observableOf } from 'rxjs/observable/of';
import { map } from 'rxjs/operators';
import {
  Collection,
  DelegateTree,
  Rule,
  Schematic,
  SchematicContext,
  SchematicEngine,
  Tree,
  VirtualTree,
  formats,
} from '../src';
import { callRule } from '../src/rules/call';
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

    this._engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));
    this._collection = this._engine.createCollection(this._collectionName);
  }

  get logger(): logging.Logger { return this._logger; }

  runSchematicAsync<SchematicSchemaT>(
    schematicName: string,
    opts?: SchematicSchemaT,
    tree?: Tree,
  ): Observable<UnitTestTree> {
    const schematic = this._collection.createSchematic(schematicName);
    const host = observableOf(tree || new VirtualTree);

    return schematic.call(opts || {}, host, { logger: this._logger })
      .pipe(map(tree => new UnitTestTree(tree)));
  }

  runSchematic<SchematicSchemaT>(
    schematicName: string,
    opts?: SchematicSchemaT,
    tree?: Tree,
  ): UnitTestTree {
    const schematic = this._collection.createSchematic(schematicName);

    let result: UnitTestTree | null = null;
    const host = observableOf(tree || new VirtualTree);

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
