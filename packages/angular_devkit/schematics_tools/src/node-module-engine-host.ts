/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {FileSystemCollectionDescription, FileSystemSchematicDescription} from './description';
import {ExportStringRef} from './export-ref';
import {FileSystemEngineHostBase} from './file-system-engine-host-base';

import {
  CollectionDescription,
  RuleFactory,
  SchematicDescription,
} from '@angular-devkit/schematics';

import {join} from 'path';


/**
 * Used to simplify typings.
 */
export declare type FileSystemCollectionDesc
  = CollectionDescription<FileSystemCollectionDescription>;
export declare type FileSystemSchematicDesc
  = SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;


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

  protected _transformCollectionDescription(name: string,
                                            desc: Partial<FileSystemCollectionDesc>) {
    if (!desc.path || !desc.schematics) {
      return null;
    }
    if (typeof desc.schematics != 'object') {
      return null;
    }
    const version = require(join(name, 'package.json'))['version'];

    return <FileSystemCollectionDesc>{
      ...desc,
      name,
      version,
    };
  }

  protected _transformSchematicDescription(_name: string,
                                           _collection: FileSystemCollectionDesc,
                                           desc: Partial<FileSystemSchematicDesc>) {
    if (!desc.factoryFn || !desc.path || !desc.description) {
      return null;
    }

    return <FileSystemSchematicDesc>desc;
  }
}
