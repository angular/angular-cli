/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { resolve } from '@angular-devkit/core/node';
import { RuleFactory } from '@angular-devkit/schematics';
import {
  CollectionCannotBeResolvedException,
  CollectionMissingSchematicsMapException,
  SchematicMissingFieldsException,
} from '@angular-devkit/schematics/tools';
import { dirname, join } from 'path';
import {
  FileSystemCollectionDesc,
  FileSystemSchematicDesc,
} from './description';
import { ExportStringRef } from './export-ref';
import { FileSystemEngineHostBase } from './file-system-engine-host-base';


/**
 * A simple EngineHost that uses NodeModules to resolve collections.
 */
export class NodeModulesEngineHost extends FileSystemEngineHostBase {
  constructor() { super(); }

  protected _resolveCollectionPath(name: string): string {
    const packageJsonPath = resolve(join(name, 'package.json'), {
      basedir: process.cwd(),
      checkLocal: true,
      checkGlobal: true,
    });

    const pkgJsonSchematics = require(packageJsonPath)['schematics'];
    if (!pkgJsonSchematics) {
      throw new CollectionCannotBeResolvedException(name);
    }

    return resolve(join(dirname(packageJsonPath), pkgJsonSchematics), {
      basedir: process.cwd(),
      checkLocal: true,
      checkGlobal: true,
    });
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
