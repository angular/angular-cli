/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Logger, schema } from '@angular-devkit/core';
import {
  Collection,
  SchematicEngine,
  Tree,
  VirtualTree,
} from '@angular-devkit/schematics';
import {
  FileSystemSchematicDesc,
  NodeModulesTestEngineHost,
} from '@angular-devkit/schematics/tools';
import { Observable } from 'rxjs/Observable';


export interface SchematicSchemaT {}

export class SchematicTestRunner {
  private _engineHost = new NodeModulesTestEngineHost();
  private _engine: SchematicEngine<{}, {}> = new SchematicEngine(this._engineHost);
  private _collection: Collection<{}, {}>;
  private _logger: Logger;
  private _registry: schema.JsonSchemaRegistry;

  constructor(private _collectionName: string, collectionPath: string) {
    this._engineHost.registerCollection(_collectionName, collectionPath);
    this._logger = new Logger('test');
    this._registry = new schema.JsonSchemaRegistry();

    this._engineHost.registerOptionsTransform((
      schematicDescription: {},
      opts: SchematicSchemaT,
    ) => {
      const schematic: FileSystemSchematicDesc = schematicDescription as FileSystemSchematicDesc;

      if (schematic.schema && schematic.schemaJson) {
        const schemaJson = schematic.schemaJson as schema.JsonSchemaObject;
        const name = schemaJson.id || schematic.name;
        this._registry.addSchema(name, schemaJson);
        const serializer = new schema.serializers.JavascriptSerializer();
        const fn = serializer.serialize(name, this._registry);

        return fn(opts);
      }

      return opts;
    });

    this._collection = this._engine.createCollection(this._collectionName);
  }

  get logger() { return this._logger; }

  runSchematicAsync(schematicName: string, opts?: SchematicSchemaT, tree?: Tree): Observable<Tree> {
    const schematic = this._collection.createSchematic(schematicName);
    const host = Observable.of(tree || new VirtualTree);

    return schematic.call(opts || {}, host, { logger: this._logger });
  }

  runSchematic(schematicName: string, opts?: SchematicSchemaT, tree?: Tree): Tree {
    const schematic = this._collection.createSchematic(schematicName);

    let result: Tree | null = null;
    const host = Observable.of(tree || new VirtualTree);

    schematic.call(opts || {}, host, { logger: this._logger })
      .subscribe(t => result = t);

    if (result === null) {
      throw new Error('Schematic is async, please use runSchematicAsync');
    }

    return result;
  }
}
