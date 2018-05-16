/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, join, normalize } from '../path';
import { stringToFileBuffer } from './buffer';
import { SimpleMemoryHost } from './memory';
import { SyncDelegateHost } from './sync';

export class TestHost extends SimpleMemoryHost {
  protected _sync: SyncDelegateHost<{}>;

  constructor(map: { [path: string]: string } = {}) {
    super();

    for (const filePath of Object.getOwnPropertyNames(map)) {
      this._write(normalize(filePath), stringToFileBuffer(map[filePath]));
    }
  }

  get files(): Path[] {
    const sync = this.sync;
    function _visit(p: Path): Path[] {
      return sync.list(p)
        .map(fragment => join(p, fragment))
        .reduce((files, path) => {
          if (sync.isDirectory(path)) {
            return files.concat(_visit(path));
          } else {
            return files.concat(path);
          }
        }, [] as Path[]);
    }

    return _visit(normalize('/'));
  }

  get sync() {
    if (!this._sync) {
      this._sync = new SyncDelegateHost<{}>(this);
    }

    return this._sync;
  }
}
