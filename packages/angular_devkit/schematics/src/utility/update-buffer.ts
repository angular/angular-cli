/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException } from '@angular-devkit/core';
import MagicString from 'magic-string';
import { TextDecoder } from 'node:util';

export class IndexOutOfBoundException extends BaseException {
  constructor(index: number, min: number, max = Infinity) {
    super(`Index ${index} outside of range [${min}, ${max}].`);
  }
}

/**
 * Base class for an update buffer implementation that allows buffers to be inserted to the _right
 * or _left, or deleted, while keeping indices to the original buffer.
 */
export abstract class UpdateBufferBase {
  constructor(protected _originalContent: Buffer) {}
  abstract get length(): number;
  abstract get original(): Buffer;
  abstract toString(encoding?: string): string;
  abstract generate(): Buffer;
  abstract insertLeft(index: number, content: Buffer, assert?: boolean): void;
  abstract insertRight(index: number, content: Buffer, assert?: boolean): void;
  abstract remove(index: number, length: number): void;

  /**
   * Creates an UpdateBufferBase instance.
   *
   * @param contentPath The path of the update buffer instance.
   * @param originalContent The original content of the update buffer instance.
   * @returns An UpdateBufferBase instance.
   */
  static create(contentPath: string, originalContent: Buffer): UpdateBufferBase {
    try {
      // We only support utf8 encoding.
      new TextDecoder('utf8', { fatal: true }).decode(originalContent);

      return new UpdateBuffer(originalContent);
    } catch (e) {
      if (e instanceof TypeError) {
        throw new Error(`Failed to decode "${contentPath}" as UTF-8 text.`);
      }

      throw e;
    }
  }
}

/**
 * An utility class that allows buffers to be inserted to the _right or _left, or deleted, while
 * keeping indices to the original buffer.
 */
export class UpdateBuffer extends UpdateBufferBase {
  protected _mutatableContent: MagicString = new MagicString(this._originalContent.toString());

  protected _assertIndex(index: number) {
    if (index < 0 || index > this._originalContent.length) {
      throw new IndexOutOfBoundException(index, 0, this._originalContent.length);
    }
  }

  get length(): number {
    return this._mutatableContent.length();
  }
  get original(): Buffer {
    return this._originalContent;
  }

  toString(): string {
    return this._mutatableContent.toString();
  }

  generate(): Buffer {
    return Buffer.from(this.toString());
  }

  insertLeft(index: number, content: Buffer): void {
    this._assertIndex(index);
    this._mutatableContent.appendLeft(index, content.toString());
  }

  insertRight(index: number, content: Buffer): void {
    this._assertIndex(index);
    this._mutatableContent.appendRight(index, content.toString());
  }

  remove(index: number, length: number) {
    this._assertIndex(index);
    this._mutatableContent.remove(index, index + length);
  }
}
