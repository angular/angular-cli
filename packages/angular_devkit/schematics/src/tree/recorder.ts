/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BaseException } from '@angular-devkit/core';
import MagicString from 'magic-string';
import { ContentHasMutatedException } from '../exception/exception';
import { FileEntry, UpdateRecorder } from './interface';

export class IndexOutOfBoundException extends BaseException {
  constructor(index: number, min: number, max: number = Infinity) {
    super(`Index ${index} outside of range [${min}, ${max}].`);
  }
}

export class UpdateRecorderBase implements UpdateRecorder {
  protected _path: string;
  protected content: MagicString;

  constructor(
    private readonly data: Uint8Array,
    path: string,
    encoding = 'utf-8',
    private readonly bom = false,
  ) {
    let text;
    try {
      text = new TextDecoder(encoding, { fatal: true, ignoreBOM: false }).decode(data);
    } catch (e) {
      if (e instanceof TypeError) {
        throw new Error(`Failed to decode "${path}" as ${encoding} text.`);
      }

      throw e;
    }

    this._path = path;
    this.content = new MagicString(text);
  }

  static createFromFileEntry(entry: FileEntry): UpdateRecorderBase {
    const c0 = entry.content.byteLength > 0 && entry.content.readUInt8(0);
    const c1 = entry.content.byteLength > 1 && entry.content.readUInt8(1);
    const c2 = entry.content.byteLength > 2 && entry.content.readUInt8(2);

    // Check if we're BOM.
    if (c0 == 0xef && c1 == 0xbb && c2 == 0xbf) {
      return new UpdateRecorderBase(entry.content, entry.path, 'utf-8', true);
    } else if (c0 === 0xff && c1 == 0xfe) {
      return new UpdateRecorderBase(entry.content, entry.path, 'utf-16le', true);
    } else if (c0 === 0xfe && c1 == 0xff) {
      return new UpdateRecorderBase(entry.content, entry.path, 'utf-16be', true);
    }

    return new UpdateRecorderBase(entry.content, entry.path);
  }

  get path(): string {
    return this._path;
  }

  protected _assertIndex(index: number): void {
    if (index < 0 || index > this.content.original.length) {
      throw new IndexOutOfBoundException(index, 0, this.content.original.length);
    }
  }

  // These just record changes.
  insertLeft(index: number, content: Buffer | string): UpdateRecorder {
    this._assertIndex(index);
    this.content.appendLeft(index, content.toString());

    return this;
  }

  insertRight(index: number, content: Buffer | string): UpdateRecorder {
    this._assertIndex(index);
    this.content.appendRight(index, content.toString());

    return this;
  }

  remove(index: number, length: number): UpdateRecorder {
    this._assertIndex(index);
    this.content.remove(index, index + length);

    return this;
  }

  apply(content: Buffer): Buffer {
    if (!content.equals(this.data)) {
      throw new ContentHasMutatedException(this.path);
    }

    // Schematics only support writing UTF-8 text
    const result = Buffer.from((this.bom ? '\uFEFF' : '') + this.content.toString(), 'utf-8');

    return result;
  }
}
