/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';
import { RuleFactory } from '@angular-devkit/schematics';
import { join } from 'path';
import {
  FileSystemCollectionDesc,
  FileSystemSchematicDesc,
} from './description';
import { ExportStringRef } from './export-ref';
import { FileSystemEngineHostBase } from './file-system-engine-host-base';


export class CollectionMissingSchematicsMapException extends BaseException {
  constructor(name: string) { super(`Collection "${name}" does not have a schematics map.`); }
}
export class SchematicMissingDescriptionException extends BaseException {
  constructor(name: string) { super(`Schematics "${name}" does not have a description.`); }
}


/**
 * A simple EngineHost that uses NodeModules to resolve collections.
 */
export class NodeModulesEngineHost extends FileSystemEngineHostBase {
  protected _resolveCollectionPath(name: string): string | null {
    const pkgJsonSchematics = require(join(name, 'package.json'))['schematics'];
    if (!pkgJsonSchematics) {
      return null;
    }

    return require.resolve(join(name, pkgJsonSchematics));
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
  ): FileSystemCollectionDesc | null {
    if (!desc.schematics || typeof desc.schematics != 'object') {
      throw new CollectionMissingSchematicsMapException(name);
    }
    const version = require(join(name, 'package.json'))['version'];

    return {
      ...desc,
      name,
      version,
    } as FileSystemCollectionDesc;
  }

  protected _transformSchematicDescription(
    _name: string,
    _collection: FileSystemCollectionDesc,
    desc: Partial<FileSystemSchematicDesc>,
  ): FileSystemSchematicDesc | null {
    if (!desc.factoryFn || !desc.path || !desc.description) {
      return null;
    }

    return desc as FileSystemSchematicDesc;
  }
}
