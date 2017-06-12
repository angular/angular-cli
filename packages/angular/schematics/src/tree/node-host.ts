/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {FileSystemTreeHost} from './filesystem';
import * as fs from 'fs';
import {join} from 'path';


export class NodeJsHost implements FileSystemTreeHost {
  constructor(private _root: string) {}

  listDirectory(path: string) {
    return fs.readdirSync(this.join(this._root, path));
  }
  isDirectory(path: string) {
    return fs.statSync(this.join(this._root, path)).isDirectory();
  }
  readFile(path: string) {
    return fs.readFileSync(this.join(this._root, path));
  }

  join(path1: string, path2: string) {
    return join(path1, path2);
  }
}
