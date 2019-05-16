/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export class LinkedList<T extends {next: T | null}> {
  constructor(private _head: T) {}

  get(l: number) {
    let c: T | null = this._head;
    while (c && l > 0) {
      l--;
      c = c.next;
    }

    return c;
  }

  get head() { return this._head; }
  get length() {
    let c: T | null = this._head;
    let i = 0;
    while (c) {
      i++;
      c = c.next;
    }

    return i;
  }

  reduce<R>(accumulator: (acc: R, value: T, index?: number) => R, seed: R) {
    let c: T | null = this._head;
    let acc = seed;
    let i = 0;
    while (c) {
      acc = accumulator(acc, c, i);
      i++;
      c = c.next;
    }

    return acc;
  }

  find(predicate: (value: T, index?: number) => boolean) {
    let c: T | null = this._head;
    let i = 0;
    while (c) {
      if (predicate(c, i)) {
        break;
      }
      i++;
      c = c.next;
    }

    return c;
  }

  forEach(visitor: (value: T, index?: number) => void) {
    let c: T | null = this._head;
    let i = 0;
    while (c) {
      visitor(c, i);
      i++;
      c = c.next;
    }
  }
}
