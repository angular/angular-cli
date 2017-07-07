/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {JsonObject} from '@angular-devkit/core';
import {
  Collection,
  CollectionDescription,
  EngineHost,
  FileSystemTree,
  RuleFactory,
  SchematicDescription,
  Source,
  TypedSchematicContext,
} from '@angular-devkit/schematics';
import {dirname, join, resolve} from 'path';
import {Url} from 'url';
import {FileSystemCollectionDescription, FileSystemSchematicDescription} from './description';
import {FileSystemHost} from './file-system-host';
import {readJsonFile} from './file-system-utility';


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

export declare type OptionTransform<T extends object, R extends object>
    = (schematic: FileSystemSchematicDescription, options: T) => R;


/**
 * A EngineHost base class that uses the file system to resolve collections. This is the base of
 * all other EngineHost provided by the tooling part of the Schematics library.
 */
export abstract class FileSystemEngineHostBase implements
    EngineHost<FileSystemCollectionDescription, FileSystemSchematicDescription> {
  protected abstract _resolveCollectionPath(name: string): string | null;
  protected abstract _resolveReferenceString(
      name: string, parentPath: string): { ref: RuleFactory<{}>, path: string } | null;
  protected abstract _transformCollectionDescription(
      name: string, desc: Partial<FileSystemCollectionDesc>): FileSystemCollectionDesc | null;
  protected abstract _transformSchematicDescription(
      name: string,
      collection: FileSystemCollectionDesc,
      desc: Partial<FileSystemSchematicDesc>): FileSystemSchematicDesc | null;

  private _transforms: OptionTransform<object, object>[] = [];

  listSchematics(collection: FileSystemCollection) {
    return Object.keys(collection.description.schematics);
  }

  registerOptionsTransform<T extends object, R extends object>(t: OptionTransform<T, R>) {
    this._transforms.push(t);
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

      const partialDesc: Partial<FileSystemCollectionDesc> | null = readJsonFile(path);
      if (!partialDesc) {
        return null;
      }

      const description = this._transformCollectionDescription(name, {
        ...partialDesc,
        path,
      });
      if (!description || !description.name) {
        return null;
      }

      return description;
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
    const partialDesc: Partial<FileSystemSchematicDesc> | null = collection.schematics[name];
    if (!partialDesc) {
      return null;
    }

    // Use any on this ref as we don't have the OptionT here, but we don't need it (we only need
    // the path).
    if (!partialDesc.factory) {
      return null;
    }
    const resolvedRef = this._resolveReferenceString(partialDesc.factory, collectionPath);
    if (!resolvedRef) {
      return null;
    }

    const { path } = resolvedRef;
    let schema = partialDesc.schema;
    let schemaJson: JsonObject | undefined = undefined;
    if (schema) {
      schema = join(collectionPath, schema);
      schemaJson = readJsonFile(schema) as JsonObject;
    }

    const description = this._transformSchematicDescription(name, collection, {
      ...partialDesc,
      schema,
      schemaJson,
      name,
      path,
      factoryFn: resolvedRef.ref,
      collection,
    });

    if (!description) {
      return null;
    }

    return description;
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

  transformOptions<OptionT extends object, ResultT extends object>(
      schematic: FileSystemSchematicDesc, options: OptionT): ResultT {
    return this._transforms.reduce((acc: ResultT, t) => t(schematic, acc), options) as ResultT;
  }

  getSchematicRuleFactory<OptionT extends object>(
    schematic: FileSystemSchematicDesc,
    _collection: FileSystemCollectionDesc): RuleFactory<OptionT> {
    return schematic.factoryFn;
  }

}
