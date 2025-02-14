/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Path, getSystemPath, join, normalize, virtualFs } from '../../src';
import { NodeJsSyncHost } from '../host';

/**
 * A Sync Scoped Host that creates a temporary directory and scope to it.
 */
export class TempScopedNodeJsSyncHost extends virtualFs.ScopedHost<fs.Stats> {
  protected _sync?: virtualFs.SyncDelegateHost<fs.Stats>;
  protected override _root: Path;

  constructor() {
    const root = normalize(path.join(os.tmpdir(), `devkit-host-${+Date.now()}-${process.pid}`));
    fs.mkdirSync(getSystemPath(root));

    super(new NodeJsSyncHost(), root);
    this._root = root;
  }

  get files(): Path[] {
    const sync = this.sync;
    function _visit(p: Path): Path[] {
      return sync
        .list(p)
        .map((fragment) => join(p, fragment))
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

  get root() {
    return this._root;
  }
  get sync() {
    if (!this._sync) {
      this._sync = new virtualFs.SyncDelegateHost<fs.Stats>(this);
    }

    return this._sync;
  }
}
