/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException } from '@angular-devkit/core';
import MagicString from 'magic-string';
import { updateBufferV2Enabled } from './environment-options';
import { LinkedList } from './linked-list';

export class IndexOutOfBoundException extends BaseException {
  constructor(index: number, min: number, max = Infinity) {
    super(`Index ${index} outside of range [${min}, ${max}].`);
  }
}
/** @deprecated Since v13.0 */
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
 * @deprecated Since v13.0
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
   * Creates an UpdateBufferBase instance. Depending on the NG_UPDATE_BUFFER_V2
   * environment variable, will either create an UpdateBuffer or an UpdateBuffer2
   * instance.
   *
   * See: https://github.com/angular/angular-cli/issues/21110
   *
   * @param originalContent The original content of the update buffer instance.
   * @returns An UpdateBufferBase instance.
   */
  static create(originalContent: Buffer): UpdateBufferBase {
    return updateBufferV2Enabled
      ? new UpdateBuffer2(originalContent)
      : new UpdateBuffer(originalContent);
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
 *
 * @deprecated Since v13.0
 */
export class UpdateBuffer extends UpdateBufferBase {
  protected _linkedList: LinkedList<Chunk>;

  constructor(originalContent: Buffer) {
    super(originalContent);
    this._linkedList = new LinkedList(new Chunk(0, originalContent.length, originalContent));
  }

  protected _assertIndex(index: number) {
    if (index < 0 || index > this._originalContent.length) {
      throw new IndexOutOfBoundException(index, 0, this._originalContent.length);
    }
  }

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
   */
  protected _getTextPosition(index: number): number {
    return Buffer.from(this._originalContent.toString().substring(0, index)).length;
  }

  get length(): number {
    return this._linkedList.reduce((acc, chunk) => acc + chunk.length, 0);
  }
  get original(): Buffer {
    return this._originalContent;
  }

  toString(encoding = 'utf-8'): string {
    return this._linkedList.reduce((acc, chunk) => acc + chunk.toString(encoding), '');
  }
  generate(): Buffer {
    const result = Buffer.allocUnsafe(this.length);
    let i = 0;
    this._linkedList.forEach((chunk) => {
      chunk.copy(result, i);
      i += chunk.length;
    });

    return result;
  }

  insertLeft(index: number, content: Buffer, assert = false) {
    this._slice(index)[0].append(content, assert);
  }
  insertRight(index: number, content: Buffer, assert = false) {
    this._slice(index)[1].prepend(content, assert);
  }

  remove(index: number, length: number) {
    const end = index + length;

    const first = this._slice(index)[1];
    const last = this._slice(end)[1];

    let curr: Chunk | null;
    for (curr = first; curr && curr !== last; curr = curr.next) {
      curr.assert(curr !== first, curr !== last, curr === first);
    }
    for (curr = first; curr && curr !== last; curr = curr.next) {
      curr.remove(curr !== first, curr !== last, curr === first);
    }

    if (curr) {
      curr.remove(true, false, false);
    }
  }
}

/**
 * An utility class that allows buffers to be inserted to the _right or _left, or deleted, while
 * keeping indices to the original buffer.
 */
export class UpdateBuffer2 extends UpdateBufferBase {
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
