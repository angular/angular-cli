/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Path } from '@angular-devkit/core';
import { FileEntry } from './interface';

export class SimpleFileEntry implements FileEntry {
  constructor(
    private _path: Path,
    private _content: Buffer,
  ) {}

  get path(): Path {
    return this._path;
  }
  get content(): Buffer {
    return this._content;
  }
}

export class LazyFileEntry implements FileEntry {
  private _content: Buffer | null = null;

  constructor(
    private _path: Path,
    private _load: (path?: Path) => Buffer,
  ) {}

  get path(): Path {
    return this._path;
  }
  get content(): Buffer {
    return this._content || (this._content = this._load(this._path));
  }
}
