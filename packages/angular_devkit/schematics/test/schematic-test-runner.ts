/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Collection,
  SchematicEngine,
  Tree,
  VirtualTree,
} from '@angular-devkit/schematics';
import {
  FileSystemSchematicDesc,
  NodeModulesEngineHost,
} from '@angular-devkit/schematics/tools';
import { SchemaClassFactory } from '@ngtools/json-schema';
import { Observable } from 'rxjs/Observable';


export interface SchematicSchemaT {}

export class SchematicTestRunner {
  private engineHost: NodeModulesEngineHost;
  private engine: SchematicEngine<{}, {}>;
  private collection: Collection<{}, {}>;

  constructor(private collectionName: string) {
    this.prepareCollection();
  }

  private prepareCollection() {
    this.engineHost = new NodeModulesEngineHost();
    this.engine = new SchematicEngine(this.engineHost);
    this.engineHost.registerOptionsTransform((
      schematic: FileSystemSchematicDesc, opts: SchematicSchemaT) => {
      if (schematic.schema && schematic.schemaJson) {
        const SchemaMetaClass = SchemaClassFactory<SchematicSchemaT>(schematic.schemaJson);
        const schemaClass = new SchemaMetaClass(opts);

        return schemaClass.$$root();
      }

      return opts;
    });
    this.collection = this.engine.createCollection(this.collectionName);
  }

  runSchematicAsync(schematicName: string, opts?: SchematicSchemaT, tree?: Tree): Observable<Tree> {
    const schematic = this.collection.createSchematic(schematicName);
    const host = Observable.of(tree || new VirtualTree);

    return schematic.call(opts || {}, host);
  }

  runSchematic(schematicName: string, opts?: SchematicSchemaT, tree?: Tree): Tree {
    const schematic = this.collection.createSchematic(schematicName);

    let result: Tree | null = null;
    const host = Observable.of(tree || new VirtualTree);

    schematic.call(opts || {}, host)
      .subscribe(t => result = t);

    if (result === null) {
      throw new Error('Schematic is async, please use runSchematicAsync');
    }

    return result;
  }
}
