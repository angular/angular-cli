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
import * as core from '@angular-devkit/core/node';
import { dirname, join, resolve as resolvePath } from 'path';
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
  constructor() { super(); }

  protected _resolvePath(name: string, basedir: string): string {
    let collectionPath;

    // Allow relative / absolute paths.
    if (name.startsWith('.') || name.startsWith('/')) {
      collectionPath = resolvePath(basedir, name);
    }

    if (!collectionPath || !core.fs.isFile(collectionPath)) {
      let packageJsonPath;
      try {
        packageJsonPath = require.resolve(join(name, 'package.json'), { paths: [basedir] });
      } catch { }
      if (packageJsonPath) {
        const pkgJsonSchematics = require(packageJsonPath)['schematics'];
        if (!pkgJsonSchematics || typeof pkgJsonSchematics != 'string') {
          throw new NodePackageDoesNotSupportSchematics(name);
        }
        collectionPath = this._resolvePath(pkgJsonSchematics, dirname(packageJsonPath));
      } else {
        try {
          collectionPath = require.resolve(name, { paths: [basedir] });
        } catch { }
      }
    }

    if (collectionPath) {
      try {
        readJsonFile(collectionPath);

        return collectionPath;
      } catch (e) {
        if (
          e instanceof InvalidJsonCharacterException || e instanceof UnexpectedEndOfInputException
        ) {
          throw new InvalidCollectionJsonException(name, collectionPath, e);
        }
      }
    }

    throw new CollectionCannotBeResolvedException(name);
  }

  protected _resolveCollectionPath(name: string): string {
    try {
      return this._resolvePath(name, process.cwd());
    } catch (e) {
      if (e instanceof CollectionCannotBeResolvedException) {
        return this._resolvePath(name, __dirname);
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
