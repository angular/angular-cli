/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '../exception';

export class DependencyNotFoundException extends BaseException {
  constructor() { super('One of the dependencies is not part of the set.'); }
}
export class CircularDependencyFoundException extends BaseException {
  constructor() { super('Circular dependencies found.'); }
}

export class PartiallyOrderedSet<T> implements Set<T> {
  private _items = new Map<T, Set<T>>();

  protected _checkCircularDependencies(item: T, deps: Set<T>) {
    if (deps.has(item)) {
      throw new CircularDependencyFoundException();
    }

    deps.forEach(dep => this._checkCircularDependencies(item, this._items.get(dep) || new Set()));
  }

  clear() {
    this._items.clear();
  }
  has(item: T) {
    return this._items.has(item);
  }
  get size() {
    return this._items.size;
  }
  forEach(
    callbackfn: (value: T, value2: T, set: PartiallyOrderedSet<T>) => void,
    thisArg?: any,  // tslint:disable-line:no-any
  ): void {
    for (const x of this) {
      callbackfn.call(thisArg, x, x, this);
    }
  }

  /**
   * Returns an iterable of [v,v] pairs for every value `v` in the set.
   */
  *entries(): IterableIterator<[T, T]> {
    for (const item of this) {
      yield [item, item];
    }
  }

  /**
   * Despite its name, returns an iterable of the values in the set,
   */
  keys(): IterableIterator<T> {
    return this.values();
  }

  /**
   * Returns an iterable of values in the set.
   */
  values(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }


  add(item: T, deps: (Set<T> | T[]) = new Set()) {
    if (Array.isArray(deps)) {
      deps = new Set(deps);
    }

    // Verify item is not already in the set.
    if (this._items.has(item)) {
      const itemDeps = this._items.get(item) || new Set<T>();

      // If the dependency list is equal, just return, otherwise remove and keep going.
      let equal = true;
      for (const dep of deps) {
        if (!itemDeps.has(dep)) {
          equal = false;
          break;
        }
      }
      if (equal) {
        for (const dep of itemDeps) {
          if (!deps.has(dep)) {
            equal = false;
            break;
          }
        }
      }

      if (equal) {
        return this;
      } else {
        this._items.delete(item);
      }
    }

    // Verify all dependencies are part of the Set.
    for (const dep of deps) {
      if (!this._items.has(dep)) {
        throw new DependencyNotFoundException();
      }
    }

    // Verify there's no dependency cycle.
    this._checkCircularDependencies(item, deps);

    this._items.set(item, new Set(deps));

    return this;
  }

  delete(item: T) {
    if (!this._items.has(item)) {
      return false;
    }

    // Remove it from all dependencies if force == true.
    this._items.forEach(value => value.delete(item));

    return this._items.delete(item);
  }

  *[Symbol.iterator]() {
    const copy: Map<T, Set<T>> = new Map(this._items);

    for (const [key, value] of copy.entries()) {
      copy.set(key, new Set(value));
    }

    while (copy.size > 0) {
      const run = [];
      // Take the first item without dependencies.
      for (const [item, deps] of copy.entries()) {
        if (deps.size == 0) {
          run.push(item);
        }
      }

      for (const item of run) {
        copy.forEach(s => s.delete(item));
        copy.delete(item);
        yield item;
      }

      if (run.length == 0) {
        // uh oh...
        throw new CircularDependencyFoundException();
      }
    }
  }

  get [Symbol.toStringTag](): 'Set' {
    return 'Set';
  }
}
