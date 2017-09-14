/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  CollectionDescription,
  RuleFactory,
  SchematicDescription,
} from '@angular-devkit/schematics';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { FileSystemCollectionDescription, FileSystemSchematicDescription } from './description';
import { ExportStringRef } from './export-ref';
import { FileSystemEngineHostBase } from './file-system-engine-host-base';
import { readJsonFile } from './file-system-utility';


/**
 * Used to simplify typings.
 */
export declare type FileSystemCollectionDesc
  = CollectionDescription<FileSystemCollectionDescription>;
export declare type FileSystemSchematicDesc
  = SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;


/**
 * A simple EngineHost that uses a registry of {name => path} to find collections. This can be
 * useful for tooling that want to load generic collections from random places.
 */
export class RegistryEngineHost extends FileSystemEngineHostBase {
  protected _registry = new Map<string, string>();

  registerPath(path: string) {
    // Read the collection from the path.

    if (existsSync(path) && statSync(path).isFile()) {
      // Allow path to be fully qualified to a JSON file.
    } else if (existsSync(join(path, 'collection.json')) && statSync(path).isFile()) {
      // Allow path to point to a directory containing a `collection.json`.
      path = join(path, 'collection.json');
    } else {
      throw new Error(`Invalid path: "${path}".`);
    }

    const json: FileSystemCollectionDesc = readJsonFile(path) as FileSystemCollectionDesc;
    if (!json) {
      throw new Error(`Invalid path for collection: "${path}".`);
    }

    // Validate that the name is not in the registry already (and that the registry does not
    // contain this path under another name.
    const name = json.name;
    const maybePath = this._registry.get(name);
    if (maybePath && maybePath != path) {
      throw new Error(`Collection name "${name}" already registered.`);
    }
    for (const registryPath of this._registry.values()) {
      if (registryPath == path) {
        throw new Error(`Collection path "${path}" already registered under another name.`);
      }
    }

    this._registry.set(name, path);
  }

  removePath(path: string) {
    for (const [key, p] of this._registry.entries()) {
      if (p == path) {
        this._registry.delete(key);
      }
    }
  }

  removeName(name: string) {
    this._registry.delete(name);
  }


  protected _resolveCollectionPath(name: string): string | null {
    const maybePath = this._registry.get(name);

    return maybePath || null;
  }

  protected _resolveReferenceString(refString: string, parentPath: string) {
    // Use the same kind of export strings as NodeModule.
    const ref = new ExportStringRef<RuleFactory<{}>>(refString, parentPath);
    if (!ref.ref) {
      return null;
    }

    return { ref: ref.ref, path: ref.module };
  }

  protected _transformCollectionDescription(_name: string,
                                            desc: Partial<FileSystemCollectionDesc>) {
    if (!desc.name || !desc.path || !desc.schematics || !desc.version) {
      return null;
    }
    if (typeof desc.schematics != 'object') {
      return null;
    }

    return desc as FileSystemCollectionDesc;
  }

  protected _transformSchematicDescription(_name: string,
                                           _collection: FileSystemCollectionDesc,
                                           desc: Partial<FileSystemSchematicDesc>) {
    if (!desc.factoryFn || !desc.path || !desc.description) {
      return null;
    }

    return desc as FileSystemSchematicDesc;
  }
}
