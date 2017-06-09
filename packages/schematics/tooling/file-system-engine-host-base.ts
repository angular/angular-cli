/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {FileSystemHost} from './file-system-host';
import {FileSystemTree} from '../src/tree/filesystem';
import {
  Collection,
  CollectionDescription,
  EngineHost,
  RuleFactory,
  SchematicDescription,
  Source,
  TypedSchematicContext
} from '../src/engine/interface';

import {dirname, join, resolve} from 'path';
import {Url} from 'url';
import {readJsonFile} from './file-system-utility';


export interface FileSystemCollectionDescription {
  readonly path: string;
  readonly version?: string;
  readonly schematics: { [name: string]: FileSystemSchematicJsonDescription };
}


export interface FileSystemSchematicJsonDescription {
  readonly factory: string;
  readonly description: string;
  readonly schema?: string;
}

export interface FileSystemSchematicDescription extends FileSystemSchematicJsonDescription {
  // Processed by the EngineHost.
  readonly path: string;
  readonly schemaJson?: Object;
  // Using `any` here is okay because the type isn't resolved when we read this value,
  // but rather when the Engine asks for it.
  readonly factoryFn: RuleFactory<any>;
}


/**
 * Used to simplify typings.
 */
export declare type FileSystemCollection
    = Collection<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemCollectionDesc
    = CollectionDescription<FileSystemCollectionDescription>;
export declare type FileSystemSchematicDesc
    = SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;
export declare type FileSystemSchematicContext
    = TypedSchematicContext<FileSystemCollectionDescription, FileSystemSchematicDescription>;


/**
 * A EngineHost base class that uses the file system to resolve collections. This is the base of
 * all other EngineHost provided by the tooling part of the Schematics library.
 */
export abstract class FileSystemEngineHostBase implements
    EngineHost<FileSystemCollectionDescription, FileSystemSchematicDescription> {
  protected abstract _resolveCollectionPath(_name: string): string | null;
  protected abstract _resolveReferenceString(
      _name: string, _parentPath: string): { ref: RuleFactory<any>, path: string } | null;

  listSchematics(collection: FileSystemCollection) {
    return Object.keys(collection.description.schematics);
  }

  /**
   *
   * @param name
   * @return {{path: string}}
   */
  createCollectionDescription(name: string): FileSystemCollectionDesc | null {
    try {
      const path = this._resolveCollectionPath(name);
      if (!path) {
        return null;
      }

      const description: FileSystemCollectionDesc = readJsonFile(path);
      if (!description.name) {
        return null;
      }

      return {
        ...description,
        path,
      };
    } catch (e) {
      return null;
    }
  }

  createSchematicDescription(
      name: string, collection: FileSystemCollectionDesc): FileSystemSchematicDesc | null {
    if (!(name in collection.schematics)) {
      return null;
    }

    const collectionPath = dirname(collection.path);
    const description = collection.schematics[name];

    if (!description) {
      return null;
    }

    // Use any on this ref as we don't have the OptionT here, but we don't need it (we only need
    // the path).
    const resolvedRef = this._resolveReferenceString(description.factory, collectionPath);
    if (!resolvedRef) {
      return null;
    }

    const { path } = resolvedRef;
    let schema = description.schema;
    let schemaJson = undefined;
    if (schema) {
      schema = join(collectionPath, schema);
      schemaJson = readJsonFile(schema);
    }

    return {
      ...description,
      schema,
      schemaJson,
      name,
      path,
      factoryFn: resolvedRef.ref,
      collection
    };
  }

  createSourceFromUrl(url: Url): Source | null {
    switch (url.protocol) {
      case null:
      case 'file:':
        return (context: FileSystemSchematicContext) => {
          // Resolve all file:///a/b/c/d from the schematic's own path, and not the current
          // path.
          const root = resolve(dirname(context.schematic.description.path), url.path);
          return new FileSystemTree(new FileSystemHost(root), true);
        };
    }

    return null;
  }

  getSchematicRuleFactory<OptionT>(
    schematic: FileSystemSchematicDesc,
    _collection: FileSystemCollectionDesc): RuleFactory<OptionT> {
    return schematic.factoryFn;
  }

}
