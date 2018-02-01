/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { fs } from '@angular-devkit/core/node';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { FileSystemTreeHost } from '../src';

export class FileSystemHost implements FileSystemTreeHost {
  constructor(private _root: string) {}

  listDirectory(path: string) {
    return readdirSync(join(this._root, path));
  }
  isDirectory(path: string) {
    return fs.isDirectory(join(this._root, path));
  }
  readFile(path: string) {
    return readFileSync(join(this._root, path));
  }
  exists(path: string) {
    return existsSync(this.join(this._root, path));
  }

  join(path1: string, path2: string) {
    return join(path1, path2);
  }
}
