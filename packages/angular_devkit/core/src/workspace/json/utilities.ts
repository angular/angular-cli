/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonArray, JsonObject, JsonValue, isJsonObject } from '../../json';

export type ChangeListener = (path: string[], newValue: JsonValue | undefined) => void;

type ChangeReporter = (
  path: string[],
  target: JsonObject | JsonArray,
  oldValue: JsonValue | undefined,
  newValue: JsonValue | undefined,
) => void;

// lib.es5 PropertyKey is string | number | symbol which doesn't overlap ProxyHandler PropertyKey which is string | symbol.
// See https://github.com/microsoft/TypeScript/issues/42894
type ProxyPropertyKey = string | symbol;

export function createVirtualAstObject<T extends object = JsonObject>(
  root: JsonObject | JsonArray,
  options: {
    exclude?: string[];
    include?: string[];
    listener?: ChangeListener;
  } = {},
): T {
  const reporter: ChangeReporter = (path, target, oldValue, newValue) => {
    if (!options.listener) {
      return;
    }

    if (oldValue === newValue || JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      // same value
      return;
    }

    if (Array.isArray(target)) {
      // For arrays we remove the index and update the entire value as keeping
      // track of changes by indices can be rather complex.
      options.listener(path.slice(0, -1), target);
    } else {
      options.listener(path, newValue);
    }
  };

  return create(
    Array.isArray(root) ? [...root] : { ...root },
    [],
    reporter,
    new Set(options.exclude),
    options.include?.length ? new Set(options.include) : undefined,
  ) as T;
}

function create(
  obj: JsonObject | JsonArray,
  path: string[],
  reporter: ChangeReporter,
  excluded = new Set<ProxyPropertyKey>(),
  included?: Set<ProxyPropertyKey>,
) {
  return new Proxy(obj, {
    getOwnPropertyDescriptor(target: {}, p: ProxyPropertyKey): PropertyDescriptor | undefined {
      if (excluded.has(p) || (included && !included.has(p))) {
        return undefined;
      }

      return Reflect.getOwnPropertyDescriptor(target, p);
    },
    has(target: {}, p: ProxyPropertyKey): boolean {
      if (typeof p === 'symbol' || excluded.has(p)) {
        return false;
      }

      return Reflect.has(target, p);
    },
    get(target: {}, p: ProxyPropertyKey): unknown {
      if (excluded.has(p) || (included && !included.has(p))) {
        return undefined;
      }

      const value = Reflect.get(target, p);
      if (typeof p === 'symbol') {
        return value;
      }

      if ((isJsonObject(value) && !(value instanceof Map)) || Array.isArray(value)) {
        return create(value, [...path, p], reporter);
      } else {
        return value;
      }
    },
    set(target: {}, p: ProxyPropertyKey, value: unknown): boolean {
      if (excluded.has(p) || (included && !included.has(p))) {
        return false;
      }

      if (value === undefined) {
        // setting to undefined is equivalent to a delete.
        return this.deleteProperty?.(target, p) ?? false;
      }

      if (typeof p === 'symbol') {
        return Reflect.set(target, p, value);
      }

      const existingValue = getCurrentValue(target, p);
      if (Reflect.set(target, p, value)) {
        reporter([...path, p], target, existingValue, value as JsonValue);

        return true;
      }

      return false;
    },
    deleteProperty(target: {}, p: ProxyPropertyKey): boolean {
      if (excluded.has(p)) {
        return false;
      }

      if (typeof p === 'symbol') {
        return Reflect.deleteProperty(target, p);
      }

      const existingValue = getCurrentValue(target, p);
      if (Reflect.deleteProperty(target, p)) {
        reporter([...path, p], target, existingValue, undefined);

        return true;
      }

      return true;
    },
    defineProperty(target: {}, p: ProxyPropertyKey, attributes: PropertyDescriptor): boolean {
      if (typeof p === 'symbol') {
        return Reflect.defineProperty(target, p, attributes);
      }

      return false;
    },
    ownKeys(target: {}): ProxyPropertyKey[] {
      return Reflect.ownKeys(target).filter(
        (p) => !excluded.has(p) && (!included || included.has(p)),
      );
    },
  });
}

function getCurrentValue(target: object, property: string): JsonValue | undefined {
  if (Array.isArray(target) && isFinite(+property)) {
    return target[+property];
  }

  if (target && property in target) {
    return (target as JsonObject)[property];
  }

  return undefined;
}
