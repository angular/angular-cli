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

  protected _resolvePackageJson(name: string, basedir = process.cwd()) {
    return core.resolve(name, {
      basedir,
      checkLocal: true,
      checkGlobal: true,
      resolvePackageJson: true,
    });
  }

  protected _resolvePath(name: string, basedir = process.cwd()) {
    // Allow relative / absolute paths.
    if (name.startsWith('.') || name.startsWith('/')) {
      return resolvePath(basedir, name);
    } else {
      // If it's a file inside a package, resolve the package then return the file...
      if (name.split('/').length > (name[0] == '@' ? 2 : 1)) {
        const rest = name.split('/');
        const packageName = rest.shift() + (name[0] == '@' ? '/' + rest.shift() : '');

        return resolvePath(core.resolve(packageName, {
          basedir,
          checkLocal: true,
          checkGlobal: true,
          resolvePackageJson: true,
        }), '..', ...rest);
      }

      return core.resolve(name, {
        basedir,
        checkLocal: true,
        checkGlobal: true,
      });
    }
  }

  protected _resolveCollectionPath(name: string): string {
    let collectionPath: string | undefined = undefined;

    if (name.replace(/\\/g, '/').split('/').length > (name[0] == '@' ? 2 : 1)) {
      try {
        collectionPath = this._resolvePath(name, process.cwd());
      } catch {
      }
    }

    if (!collectionPath) {
      let packageJsonPath = this._resolvePackageJson(name, process.cwd());
      // If it's a file, use it as is. Otherwise append package.json to it.
      if (!core.fs.isFile(packageJsonPath)) {
        packageJsonPath = join(packageJsonPath, 'package.json');
      }

      const pkgJsonSchematics = require(packageJsonPath)['schematics'];
      if (!pkgJsonSchematics || typeof pkgJsonSchematics != 'string') {
        throw new NodePackageDoesNotSupportSchematics(name);
      }
      collectionPath = this._resolvePath(pkgJsonSchematics, dirname(packageJsonPath));
    }

    try {
      if (collectionPath) {
        readJsonFile(collectionPath);

        return collectionPath;
      }
    } catch (e) {
      if (
        e instanceof InvalidJsonCharacterException || e instanceof UnexpectedEndOfInputException
      ) {
        throw new InvalidCollectionJsonException(name, collectionPath, e);
      }
    }

    throw new CollectionCannotBeResolvedException(name);
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
