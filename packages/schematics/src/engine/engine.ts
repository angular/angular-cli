/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {CollectionImpl} from './collection';
import {
  Collection,
  Engine,
  EngineHost,
  Schematic,
  Source,
  TypedSchematicContext
} from './interface';
import {SchematicImpl} from './schematic';
import {BaseException} from '../exception/exception';
import {MergeStrategy} from '../tree/interface';
import {NullTree} from '../tree/null';
import {branch, empty} from '../tree/static';

import {Url} from 'url';
import 'rxjs/add/operator/map';


export class UnknownUrlSourceProtocol extends BaseException {
  constructor(url: string) { super(`Unknown Protocol on url "${url}".`); }
}

export class UnknownCollectionException extends BaseException {
  constructor(name: string) { super(`Unknown collection "${name}".`); }
}
export class UnknownSchematicException extends BaseException {
  constructor(name: string, collection: Collection<any, any>) {
    super(`Schematic "${name}" not found in collection "${collection.name}".`);
  }
}


export class SchematicEngine<CollectionT, SchematicT> implements Engine<CollectionT, SchematicT> {
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

  createSchematic(
      name: string,
      collection: Collection<CollectionT, SchematicT>): Schematic<CollectionT, SchematicT> {
    const collectionImpl = this._collectionCache.get(collection.name);
    const schematicMap = this._schematicCache.get(collection.name);
    if (!collectionImpl || !schematicMap || collectionImpl !== collection) {
      // This is weird, maybe the collection was created by another engine?
      throw new UnknownCollectionException(collection.name);
    }

    let schematic = schematicMap.get(name);
    if (schematic) {
      return schematic;
    }

    const description = this._host.createSchematicDescription(name, collection.description);
    if (!description) {
      throw new UnknownSchematicException(name, collection);
    }
    const factory = this._host.getSchematicRuleFactory(description, collection.description);
    schematic = new SchematicImpl<CollectionT, SchematicT>(description, factory, collection, this);

    schematicMap.set(name, schematic);
    return schematic;
  }

  createSourceFromUrl(url: Url): Source {
    switch (url.protocol) {
      case 'null:': return () => new NullTree();
      case 'empty:': return () => empty();
      case 'host:': return (context: TypedSchematicContext<CollectionT, SchematicT>) => {
        return context.host.map(tree => branch(tree));
      };
      default:
        const hostSource = this._host.createSourceFromUrl(url);
        if (!hostSource) {
          throw new UnknownUrlSourceProtocol(url.toString());
        }
        return hostSource;
    }
  }
}
