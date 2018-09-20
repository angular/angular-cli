/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Path, PathFragment, getSystemPath, join, normalize, virtualFs } from '../../src';
import { NodeJsSyncHost } from '../host';

/**
 * A Sync Scoped Host that creates a temporary directory and scope to it.
 */
export class TempScopedNodeJsSyncHost extends virtualFs.ScopedHost<fs.Stats> {
  protected _sync: virtualFs.SyncDelegateHost<fs.Stats>;
  protected _root: Path;

  constructor() {
    const root = normalize(path.join(os.tmpdir(), `devkit-host-${+Date.now()}-${process.pid}`));
    fs.mkdirSync(getSystemPath(root));

    super(new NodeJsSyncHost(), root);
    this._root = root;
  }

  get files(): Path[] {
    const sync = this.sync;
    function _visit(p: Path): Path[] {
      return sync.list(p)
        .map((fragment: PathFragment) => join(p, fragment))
        .reduce((files: Path[], path: PathFragment) => {
          if (sync.isDirectory(path)) {
            return files.concat(_visit(path));
          } else {
            return files.concat(path);
          }
        }, [] as Path[]);
    }

    return _visit(normalize('/'));
  }

  get root() { return this._root; }
  get sync() {
    if (!this._sync) {
      this._sync = new virtualFs.SyncDelegateHost<fs.Stats>(this);
    }

    return this._sync;
  }
}
