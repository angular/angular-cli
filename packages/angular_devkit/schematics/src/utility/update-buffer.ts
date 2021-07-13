/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException, MagicString } from '@angular-devkit/core';
import { LinkedList } from './linked-list';

export class IndexOutOfBoundException extends BaseException {
  constructor(index: number, min: number, max = Infinity) {
    super(`Index ${index} outside of range [${min}, ${max}].`);
  }
}
/** @deprecated Since v12.2, unused by the Angular tooling */
export class ContentCannotBeRemovedException extends BaseException {
  constructor() {
    super(`User tried to remove content that was marked essential.`);
  }
}

/**
 * A Chunk description, including left/right content that has been inserted.
 * If _left/_right is null, this means that content was deleted. If the _content is null,
 * it means the content itself was deleted.
 *
 * @see UpdateBuffer
 * @deprecated Since v12.2, unused by the Angular tooling (replaced by magic-string)
 */
export class Chunk {
  private _content: Buffer | null;
  private _left: Buffer | null = Buffer.alloc(0);
  private _right: Buffer | null = Buffer.alloc(0);

  private _assertLeft = false;
  private _assertRight = false;

  next: Chunk | null = null;

  constructor(public start: number, public end: number, public originalContent: Buffer) {
    this._content = originalContent.slice(start, end);
  }

  get length() {
    return (
      (this._left ? this._left.length : 0) +
      (this._content ? this._content.length : 0) +
      (this._right ? this._right.length : 0)
    );
  }
  toString(encoding = 'utf-8') {
    return (
      (this._left ? this._left.toString(encoding) : '') +
      (this._content ? this._content.toString(encoding) : '') +
      (this._right ? this._right.toString(encoding) : '')
    );
  }

  slice(start: number) {
    if (start < this.start || start > this.end) {
      throw new IndexOutOfBoundException(start, this.start, this.end);
    }

    // Update _content to the new indices.
    const newChunk = new Chunk(start, this.end, this.originalContent);

    // If this chunk has _content, reslice the original _content. We move the _right so we are not
    // losing any data here. If this chunk has been deleted, the next chunk should also be deleted.
    if (this._content) {
      this._content = this.originalContent.slice(this.start, start);
    } else {
      newChunk._content = this._content;
      if (this._right === null) {
        newChunk._left = null;
      }
    }
    this.end = start;

    // Move _right to the new chunk.
    newChunk._right = this._right;
    this._right = this._right && Buffer.alloc(0);

    // Update essentials.
    if (this._assertRight) {
      newChunk._assertRight = true;
      this._assertRight = false;
    }

    // Update the linked list.
    newChunk.next = this.next;
    this.next = newChunk;

    return newChunk;
  }

  append(buffer: Buffer, essential: boolean) {
    if (!this._right) {
      if (essential) {
        throw new ContentCannotBeRemovedException();
      }

      return;
    }

    const outro = this._right;
    this._right = Buffer.alloc(outro.length + buffer.length);
    outro.copy(this._right, 0);
    buffer.copy(this._right, outro.length);

    if (essential) {
      this._assertRight = true;
    }
  }
  prepend(buffer: Buffer, essential: boolean) {
    if (!this._left) {
      if (essential) {
        throw new ContentCannotBeRemovedException();
      }

      return;
    }

    const intro = this._left;
    this._left = Buffer.alloc(intro.length + buffer.length);
    intro.copy(this._left, 0);
    buffer.copy(this._left, intro.length);

    if (essential) {
      this._assertLeft = true;
    }
  }

  assert(left: boolean, _content: boolean, right: boolean) {
    if (left && this._assertLeft) {
      throw new ContentCannotBeRemovedException();
    }

    if (right && this._assertRight) {
      throw new ContentCannotBeRemovedException();
    }
  }

  remove(left: boolean, content: boolean, right: boolean) {
    if (left) {
      if (this._assertLeft) {
        throw new ContentCannotBeRemovedException();
      }
      this._left = null;
    }
    if (content) {
      this._content = null;
    }
    if (right) {
      if (this._assertRight) {
        throw new ContentCannotBeRemovedException();
      }
      this._right = null;
    }
  }

  copy(target: Buffer, start: number) {
    if (this._left) {
      this._left.copy(target, start);
      start += this._left.length;
    }
    if (this._content) {
      this._content.copy(target, start);
      start += this._content.length;
    }
    if (this._right) {
      this._right.copy(target, start);
      start += this._right.length;
    }

    return start;
  }
}

/**
 * An utility class that allows buffers to be inserted to the _right or _left, or deleted, while
 * keeping indices to the original buffer.
 *
 * The constructor takes an original buffer, and keeps it into a linked list of chunks, smaller
 * buffers that keep track of _content inserted to the _right or _left of it.
 *
 * Since the Node Buffer structure is non-destructive when slicing, we try to use slicing to create
 * new chunks, and always keep chunks pointing to the original content.
 */
export class UpdateBuffer {
  /** @deprecated Since v12.2, unused by the Angular tooling (replaced by magic-string) */
  protected _linkedList: LinkedList<Chunk>;
  protected _mutatableContent: MagicString;

  constructor(protected _originalContent: Buffer) {
    this._linkedList = new LinkedList(new Chunk(0, _originalContent.length, _originalContent));
    this._mutatableContent = new MagicString(this._originalContent.toString());
  }

  protected _assertIndex(index: number) {
    if (index < 0 || index > this._originalContent.length) {
      throw new IndexOutOfBoundException(index, 0, this._originalContent.length);
    }
  }

  /** @deprecated Since v12.2, unused by the Angular tooling */
  protected _slice(start: number): [Chunk, Chunk] {
    // If start is longer than the content, use start, otherwise determine exact position in string.
    const index = start >= this._originalContent.length ? start : this._getTextPosition(start);

    this._assertIndex(index);

    // Find the chunk by going through the list.
    const h = this._linkedList.find((chunk) => index <= chunk.end);
    if (!h) {
      throw Error('Chunk cannot be found.');
    }

    if (index == h.end && h.next !== null) {
      return [h, h.next];
    }

    return [h, h.slice(index)];
  }

  /**
   * Gets the position in the content based on the position in the string.
   * Some characters might be wider than one byte, thus we have to determine the position using
   * string functions.
   *
   * @deprecated Since v12.2, unused by the Angular tooling
   */
  protected _getTextPosition(index: number): number {
    return Buffer.from(this._originalContent.toString().substring(0, index)).length;
  }

  get length(): number {
    return this._mutatableContent.length();
  }
  get original(): Buffer {
    return this._originalContent;
  }

  toString(): string;
  /** @deprecated Since v12.2, encoding no longer has any effect */
  toString(encoding: string): string;
  toString(_encoding = 'utf-8'): string {
    return this._mutatableContent.toString();
  }
  generate(): Buffer {
    return Buffer.from(this.toString());
  }

  insertLeft(index: number, content: Buffer): void;
  /** @deprecated Since v12.2, assert no longer has any effect */
  insertLeft(index: number, content: Buffer, assert: boolean): void;
  insertLeft(index: number, content: Buffer, _assert = false) {
    this._assertIndex(index);
    this._mutatableContent.appendLeft(index, content.toString());
  }
  insertRight(index: number, content: Buffer): void;
  /** @deprecated Since v12.2, assert no longer has any effect */
  insertRight(index: number, content: Buffer, assert: boolean): void;
  insertRight(index: number, content: Buffer, _assert = false) {
    this._assertIndex(index);
    this._mutatableContent.appendRight(index, content.toString());
  }

  remove(index: number, length: number) {
    this._assertIndex(index);
    this._mutatableContent.remove(index, index + length);
  }
}
