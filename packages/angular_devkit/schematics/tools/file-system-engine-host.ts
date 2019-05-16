/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { existsSync } from 'fs';
import { join } from 'path';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RuleFactory, TaskExecutor, UnregisteredTaskException } from '../src';
import { FileSystemCollectionDesc, FileSystemSchematicDesc } from './description';
import { ExportStringRef } from './export-ref';
import {
  CollectionCannotBeResolvedException,
  CollectionMissingSchematicsMapException,
  FileSystemEngineHostBase,
  SchematicMissingFieldsException,
} from './file-system-engine-host-base';


/**
 * A simple EngineHost that uses a root with one directory per collection inside of it. The
 * collection declaration follows the same rules as the regular FileSystemEngineHostBase.
 */
export class FileSystemEngineHost extends FileSystemEngineHostBase {
  constructor(protected _root: string) { super(); }

  protected _resolveCollectionPath(name: string): string {
    try {
      // Allow `${_root}/${name}.json` as a collection.
      const maybePath = require.resolve(join(this._root, name + '.json'));
      if (existsSync(maybePath)) {
        return maybePath;
      }
    } catch (error) { }

    try {
      // Allow `${_root}/${name}/collection.json.
      const maybePath = require.resolve(join(this._root, name, 'collection.json'));
      if (existsSync(maybePath)) {
        return maybePath;
      }
    } catch (error) { }


    throw new CollectionCannotBeResolvedException(name);
  }

  protected _resolveReferenceString(refString: string, parentPath: string) {
    // Use the same kind of export strings as NodeModule.
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

  hasTaskExecutor(name: string): boolean {
    if (super.hasTaskExecutor(name)) {
      return true;
    }

    try {
      const maybePath = require.resolve(join(this._root, name));
      if (existsSync(maybePath)) {
        return true;
      }
    } catch {}

    return false;
  }

  createTaskExecutor(name: string): Observable<TaskExecutor> {
    if (!super.hasTaskExecutor(name)) {
      try {
        const path = require.resolve(join(this._root, name));

        return from(import(path).then(mod => mod.default())).pipe(
          catchError(() => throwError(new UnregisteredTaskException(name))),
        );
      } catch {}
    }

    return super.createTaskExecutor(name);
  }
}
