/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ContentHasMutatedException } from '../exception/exception';
import { UpdateBuffer } from '../utility/update-buffer';
import { FileEntry, UpdateRecorder } from './interface';

export class UpdateRecorderBase implements UpdateRecorder {
  protected _path: string;
  protected _original: Buffer;
  protected _content: UpdateBuffer;

  constructor(entry: FileEntry) {
    this._original = Buffer.from(entry.content);
    this._content = new UpdateBuffer(entry.content);
    this._path = entry.path;
  }

  static createFromFileEntry(entry: FileEntry): UpdateRecorderBase {
    const c0 = entry.content.byteLength > 0 && entry.content.readUInt8(0);
    const c1 = entry.content.byteLength > 1 && entry.content.readUInt8(1);
    const c2 = entry.content.byteLength > 2 && entry.content.readUInt8(2);

    // Check if we're BOM.
    if (c0 == 0xef && c1 == 0xbb && c2 == 0xbf) {
      return new UpdateRecorderBom(entry);
    } else if (c0 === 0xff && c1 == 0xfe) {
      return new UpdateRecorderBom(entry);
    } else if (c0 === 0xfe && c1 == 0xff) {
      return new UpdateRecorderBom(entry);
    }

    return new UpdateRecorderBase(entry);
  }

  get path() {
    return this._path;
  }

  // These just record changes.
  insertLeft(index: number, content: Buffer | string): UpdateRecorder {
    this._content.insertLeft(index, typeof content == 'string' ? Buffer.from(content) : content);

    return this;
  }

  insertRight(index: number, content: Buffer | string): UpdateRecorder {
    this._content.insertRight(index, typeof content == 'string' ? Buffer.from(content) : content);

    return this;
  }

  remove(index: number, length: number): UpdateRecorder {
    this._content.remove(index, length);

    return this;
  }

  apply(content: Buffer): Buffer {
    if (!content.equals(this._content.original)) {
      throw new ContentHasMutatedException(this.path);
    }

    return this._content.generate();
  }
}

export class UpdateRecorderBom extends UpdateRecorderBase {
  constructor(entry: FileEntry, private _delta = 1) {
    super(entry);
  }

  insertLeft(index: number, content: Buffer | string) {
    return super.insertLeft(index + this._delta, content);
  }

  insertRight(index: number, content: Buffer | string) {
    return super.insertRight(index + this._delta, content);
  }

  remove(index: number, length: number) {
    return super.remove(index + this._delta, length);
  }
}
