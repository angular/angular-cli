/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicEngine } from './engine';
import { Collection, CollectionDescription, Schematic } from './interface';


export class CollectionImpl<CollectionT extends object, SchematicT extends object>
    implements Collection<CollectionT, SchematicT> {
  constructor(private _description: CollectionDescription<CollectionT>,
              private _engine: SchematicEngine<CollectionT, SchematicT>) {
  }

  get description() { return this._description; }
  get name() { return this.description.name || '<unknown>'; }

  createSchematic(name: string): Schematic<CollectionT, SchematicT> {
    return this._engine.createSchematic(name, this);
  }

  listSchematicNames(): string[] {
    return this._engine.listSchematicNames(this);
  }
}
