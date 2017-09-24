/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, NullLogger } from '@angular-devkit/core';
import { CollectionDescription, TypedSchematicContext } from '@angular-devkit/schematics';
import 'rxjs/add/operator/map';
import { Url } from 'url';
import { MergeStrategy } from '../tree/interface';
import { NullTree } from '../tree/null';
import { empty } from '../tree/static';
import { CollectionImpl } from './collection';
import {
  Collection,
  Engine,
  EngineHost,
  Schematic,
  Source,
} from './interface';
import { SchematicImpl } from './schematic';


export class UnknownUrlSourceProtocol extends BaseException {
  constructor(url: string) { super(`Unknown Protocol on url "${url}".`); }
}

export class UnknownCollectionException extends BaseException {
  constructor(name: string) { super(`Unknown collection "${name}".`); }
}
export class UnknownSchematicException extends BaseException {
  constructor(name: string, collection: CollectionDescription<{}>) {
    super(`Schematic "${name}" not found in collection "${collection.name}".`);
  }
}

export class SchematicEngineConflictingException extends BaseException {
  constructor() { super(`A schematic was called from a different engine as its parent.`); }
}


export class SchematicEngine<CollectionT extends object, SchematicT extends object>
    implements Engine<CollectionT, SchematicT> {

  private _collectionCache = new Map<string, CollectionImpl<CollectionT, SchematicT>>();
  private _schematicCache
    = new Map<string, Map<string, SchematicImpl<CollectionT, SchematicT>>>();

  constructor(private _host: EngineHost<CollectionT, SchematicT>) {
  }

  get defaultMergeStrategy() { return this._host.defaultMergeStrategy || MergeStrategy.Default; }

  createCollection(name: string): Collection<CollectionT, SchematicT> {
    let collection = this._collectionCache.get(name);
    if (collection) {
      return collection;
    }

    const description = this._host.createCollectionDescription(name);
    if (!description) {
      throw new UnknownCollectionException(name);
    }

    collection = new CollectionImpl<CollectionT, SchematicT>(description, this);
    this._collectionCache.set(name, collection);
    this._schematicCache.set(name, new Map());

    return collection;
  }

  createContext(
    schematic: Schematic<CollectionT, SchematicT>,
    parent?: Partial<TypedSchematicContext<CollectionT, SchematicT>>,
  ): TypedSchematicContext<CollectionT, SchematicT> {
    // Check for inconsistencies.
    if (parent && parent.engine && parent.engine !== this) {
      throw new SchematicEngineConflictingException();
    }

    return {
      debug: parent && parent.debug || false,
      engine: this,
      logger: (parent && parent.logger) || new NullLogger(),
      schematic,
      strategy: (parent && parent.strategy !== undefined)
        ? parent.strategy : this.defaultMergeStrategy,
    };
  }

  createSchematic(
      name: string,
      collection: Collection<CollectionT, SchematicT>): Schematic<CollectionT, SchematicT> {
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

    const description = this._host.createSchematicDescription(name, collection.description);
    if (!description) {
      throw new UnknownSchematicException(name, collection.description);
    }

    const factory = this._host.getSchematicRuleFactory(description, collection.description);
    schematic = new SchematicImpl<CollectionT, SchematicT>(description, factory, collection, this);

    schematicMap.set(name, schematic);

    return schematic;
  }

  transformOptions<OptionT extends object, ResultT extends object>(
      schematic: Schematic<CollectionT, SchematicT>, options: OptionT): ResultT {
    return this._host.transformOptions<OptionT, ResultT>(
      schematic.description,
      options,
    );
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
}
