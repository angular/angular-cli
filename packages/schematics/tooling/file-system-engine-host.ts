/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {ExportStringRef} from './export-ref';
import {FileSystemEngineHostBase} from './file-system-engine-host-base';
import {RuleFactory} from '../src/engine/interface';

import {join} from 'path';
import {existsSync} from 'fs';


/**
 * A simple EngineHost that uses a root with one directory per collection inside of it. The
 * collection declaration follows the same rules as the regular FileSystemEngineHostBase.
 */
export class FileSystemEngineHost extends FileSystemEngineHostBase {
  constructor(protected _root: string) { super(); }

  protected _resolveCollectionPath(name: string): string | null {
    // Allow `${_root}/${name}.json` as a collection.
    if (existsSync(join(this._root, name + '.json'))) {
      return join(this._root, name + '.json');
    }

    // Allow `${_root}/${name}/collection.json.
    if (existsSync(join(this._root, name, 'collection.json'))) {
      return join(this._root, name, 'collection.json');
    }

    return null;
  }

  protected _resolveReferenceString(refString: string, parentPath: string) {
    // Use the same kind of export strings as NodeModule.
    const ref = new ExportStringRef<RuleFactory<any>>(refString, parentPath);
    return { ref: ref.ref, path: ref.module };
  }
}
