/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BaseException } from '@angular-devkit/core';
import { dirname, join, resolve } from 'node:path';
import { RuleFactory } from '../src';
import { FileSystemCollectionDesc, FileSystemSchematicDesc } from './description';
import { ExportStringRef } from './export-ref';
import {
  CollectionCannotBeResolvedException,
  CollectionMissingSchematicsMapException,
  FileSystemEngineHostBase,
  SchematicMissingFieldsException,
} from './file-system-engine-host-base';
import { readJsonFile } from './file-system-utility';

export class NodePackageDoesNotSupportSchematics extends BaseException {
  constructor(name: string) {
    super(`Package ${JSON.stringify(name)} was found but does not support schematics.`);
  }
}

/**
 * A simple EngineHost that uses NodeModules to resolve collections.
 */
export class NodeModulesEngineHost extends FileSystemEngineHostBase {
  constructor(private readonly paths?: string[]) {
    super();
  }

  private resolve(name: string, requester?: string, references = new Set<string>()): string {
    // Keep track of the package requesting the schematic, in order to avoid infinite recursion
    if (requester) {
      if (references.has(requester)) {
        references.add(requester);
        throw new Error(
          'Circular schematic reference detected: ' + JSON.stringify(Array.from(references)),
        );
      } else {
        references.add(requester);
      }
    }

    const relativeBase = requester ? dirname(requester) : process.cwd();
    let collectionPath: string | undefined = undefined;

    if (name.startsWith('.')) {
      name = resolve(relativeBase, name);
    }

    const resolveOptions = {
      paths: requester ? [dirname(requester), ...(this.paths || [])] : this.paths,
    };

    // Try to resolve as a package
    try {
      const packageJsonPath = require.resolve(join(name, 'package.json'), resolveOptions);
      const { schematics } = require(packageJsonPath);

      if (!schematics || typeof schematics !== 'string') {
        throw new NodePackageDoesNotSupportSchematics(name);
      }

      // If this is a relative path to the collection, then create the collection
      // path in relation to the package path
      if (schematics.startsWith('.')) {
        const packageDirectory = dirname(packageJsonPath);
        collectionPath = resolve(packageDirectory, schematics);
      }
      // Otherwise treat this as a package, and recurse to find the collection path
      else {
        collectionPath = this.resolve(schematics, packageJsonPath, references);
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
        throw e;
      }
    }

    // If not a package, try to resolve as a file
    if (!collectionPath) {
      try {
        collectionPath = require.resolve(name, resolveOptions);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
          throw e;
        }
      }
    }

    // If not a package or a file, error
    if (!collectionPath) {
      throw new CollectionCannotBeResolvedException(name);
    }

    return collectionPath;
  }

  protected _resolveCollectionPath(name: string, requester?: string): string {
    const collectionPath = this.resolve(name, requester);
    readJsonFile(collectionPath);

    return collectionPath;
  }

  protected _resolveReferenceString(
    refString: string,
    parentPath: string,
    collectionDescription?: FileSystemCollectionDesc,
  ) {
    const ref = new ExportStringRef<RuleFactory<{}>>(refString, parentPath);
    if (!ref.ref) {
      return null;
    }

    return { ref: ref.ref, path: ref.module };
  }

  protected _transformCollectionDescription(
    name: string,
    desc: Partial<FileSystemCollectionDesc>,
  ): FileSystemCollectionDesc {
    if (!desc.schematics || typeof desc.schematics != 'object') {
      throw new CollectionMissingSchematicsMapException(name);
    }

    return {
      ...desc,
      name,
    } as FileSystemCollectionDesc;
  }

  protected _transformSchematicDescription(
    name: string,
    _collection: FileSystemCollectionDesc,
    desc: Partial<FileSystemSchematicDesc>,
  ): FileSystemSchematicDesc {
    if (!desc.factoryFn || !desc.path || !desc.description) {
      throw new SchematicMissingFieldsException(name);
    }

    return desc as FileSystemSchematicDesc;
  }
}
