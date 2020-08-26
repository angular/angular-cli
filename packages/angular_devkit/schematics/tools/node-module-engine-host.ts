/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BaseException,
  InvalidJsonCharacterException,
  UnexpectedEndOfInputException,
} from '@angular-devkit/core';
import { dirname, join, resolve } from 'path';
import { RuleFactory } from '../src';
import {
  FileSystemCollectionDesc,
  FileSystemSchematicDesc,
} from './description';
import { ExportStringRef } from './export-ref';
import {
  CollectionCannotBeResolvedException,
  CollectionMissingSchematicsMapException,
  FileSystemEngineHostBase,
  InvalidCollectionJsonException,
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
  constructor(private readonly paths?: string[]) { super(); }

  private resolve(name: string, requester?: string, references = new Set<string>()): string {
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

      collectionPath = this.resolve(schematics, packageJsonPath, references);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }
    }

    // If not a package, try to resolve as a file
    if (!collectionPath) {
      try {
        collectionPath = require.resolve(name, resolveOptions);
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
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

  protected _resolveCollectionPath(name: string): string {
    const collectionPath = this.resolve(name);

    try {
      readJsonFile(collectionPath);

      return collectionPath;
    } catch (e) {
      if (
        e instanceof InvalidJsonCharacterException || e instanceof UnexpectedEndOfInputException
      ) {
        throw new InvalidCollectionJsonException(name, collectionPath, e);
      } else {
        throw e;
      }
    }
  }

  protected _resolveReferenceString(refString: string, parentPath: string) {
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
