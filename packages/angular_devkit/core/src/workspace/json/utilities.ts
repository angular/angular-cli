/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonAstArray,
  JsonAstKeyValue,
  JsonAstNode,
  JsonAstObject,
  JsonObject,
  JsonValue,
} from '../../json';

const stableStringify = require('fast-json-stable-stringify');

interface CacheEntry {
  value?: JsonValue;
  node?: JsonAstNode;
  parent: JsonAstArray | JsonAstKeyValue | JsonAstObject;
}

export type ChangeListener = (
  op: 'add' | 'remove' | 'replace',
  path: string,
  node: JsonAstArray | JsonAstObject | JsonAstKeyValue,
  value?: JsonValue,
) => void;

type ChangeReporter = (
  path: string,
  parent: JsonAstArray | JsonAstKeyValue | JsonAstObject,
  node?: JsonAstNode,
  old?: JsonValue,
  current?: JsonValue,
) => void;

function findNode(
  parent: JsonAstArray | JsonAstObject,
  p: PropertyKey,
): { node?: JsonAstNode; parent: JsonAstArray | JsonAstKeyValue | JsonAstObject } {
  if (parent.kind === 'object') {
    const entry = parent.properties.find(entry => entry.key.value === p);
    if (entry) {
      return { node: entry.value, parent: entry };
    }
  } else {
    const index = Number(p);
    if (!isNaN(index)) {
      return { node: parent.elements[index], parent };
    }
  }

  return { parent };
}

function createPropertyDescriptor(value: JsonValue | undefined): PropertyDescriptor {
  return {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  };
}

export function escapeKey(key: string | number): string | number {
  if (typeof key === 'number') {
    return key;
  }

  return key.replace('~', '~0').replace('/', '~1');
}

export function unescapeKey(key: string | number): string | number {
  if (typeof key === 'number') {
    return key;
  }

  return key.replace('~1', '/').replace('~0', '~');
}

export function createVirtualAstObject<T extends object = JsonObject>(
  root: JsonAstObject,
  options: {
    exclude?: string[];
    include?: string[];
    listener?: ChangeListener;
    base?: object;
  } = {},
): T {
  const reporter: ChangeReporter = (path, parent, node, old, current) => {
    if (options.listener) {
      if (old === current || stableStringify(old) === stableStringify(current)) {
        return;
      }

      const op = old === undefined ? 'add' : current === undefined ? 'remove' : 'replace';
      options.listener(
        op,
        path,
        parent,
        current,
      );
    }
  };

  return create(
    root,
    '',
    reporter,
    new Set(options.exclude),
    options.include && options.include.length > 0 ? new Set(options.include) : undefined,
    options.base,
  ) as T;
}

function create(
  ast: JsonAstObject | JsonAstArray,
  path: string,
  reporter: ChangeReporter,
  excluded = new Set<PropertyKey>(),
  included?: Set<PropertyKey>,
  base?: object,
) {
  const cache = new Map<string, CacheEntry>();
  const alteredNodes = new Set<JsonAstNode>();

  if (!base) {
    if (ast.kind === 'object') {
      base = Object.create(null) as object;
    } else {
      base = [];
      (base as Array<unknown>).length = ast.elements.length;
    }
  }

  return new Proxy(base, {
    getOwnPropertyDescriptor(target: {}, p: PropertyKey): PropertyDescriptor | undefined {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, p);
      if (descriptor || typeof p === 'symbol') {
        return descriptor;
      } else if (excluded.has(p) || (included && !included.has(p))) {
        return undefined;
      }

      const propertyPath = path + '/' + escapeKey(p);
      const cacheEntry = cache.get(propertyPath);
      if (cacheEntry) {
        if (cacheEntry.value) {
          return createPropertyDescriptor(cacheEntry.value);
        }

        return undefined;
      }

      const { node } = findNode(ast, p);
      if (node) {
        return createPropertyDescriptor(node.value);
      }

      return undefined;
    },
    has(target: {}, p: PropertyKey): boolean {
      if (Reflect.has(target, p)) {
        return true;
      } else if (typeof p === 'symbol' || excluded.has(p)) {
        return false;
      }

      return cache.has(path + '/' + escapeKey(p)) || findNode(ast, p) !== undefined;
    },
    get(target: {}, p: PropertyKey): unknown {
      if (typeof p === 'symbol' || Reflect.has(target, p)) {
        return Reflect.get(target, p);
      } else if (excluded.has(p) || (included && !included.has(p))) {
        return undefined;
      }

      const propertyPath = path + '/' + escapeKey(p);
      const cacheEntry = cache.get(propertyPath);
      if (cacheEntry) {
        return cacheEntry.value;
      }

      const { node, parent } = findNode(ast, p);
      let value;
      if (node) {
        if (node.kind === 'object' || node.kind === 'array') {
          value = create(
            node,
            propertyPath,
            (path, parent, vnode, old, current) => {
              if (!alteredNodes.has(node)) {
                reporter(path, parent, vnode, old, current);
              }
            },
          );
        } else {
          value = node.value;
        }

        cache.set(propertyPath, { node, parent, value });
      }

      return value;
    },
    set(target: {}, p: PropertyKey, value: unknown): boolean {
      if (typeof p === 'symbol' || Reflect.has(target, p)) {
        return Reflect.set(target, p, value);
      } else if (excluded.has(p) || (included && !included.has(p))) {
        return false;
      }

      // TODO: Check if is JSON value
      const jsonValue = value as JsonValue;

      const propertyPath = path + '/' + escapeKey(p);
      const cacheEntry = cache.get(propertyPath);
      if (cacheEntry) {
        const oldValue = cacheEntry.value;
        cacheEntry.value = value as JsonValue;
        if (cacheEntry.node && oldValue !== value) {
          alteredNodes.add(cacheEntry.node);
        }
        reporter(propertyPath, cacheEntry.parent, cacheEntry.node, oldValue, jsonValue);
      } else {
        const { node, parent } = findNode(ast, p);
        cache.set(propertyPath, { node, parent, value: value as JsonValue });
        if (node && node.value !== value) {
          alteredNodes.add(node);
        }
        reporter(propertyPath, parent, node, node && node.value, value as JsonValue);
      }

      return true;
    },
    deleteProperty(target: {}, p: PropertyKey): boolean {
      if (typeof p === 'symbol' || Reflect.has(target, p)) {
        return Reflect.deleteProperty(target, p);
      } else if (excluded.has(p) || (included && !included.has(p))) {
        return false;
      }

      const propertyPath = path + '/' + escapeKey(p);
      const cacheEntry = cache.get(propertyPath);
      if (cacheEntry) {
        const oldValue = cacheEntry.value;
        cacheEntry.value = undefined;
        if (cacheEntry.node) {
          alteredNodes.add(cacheEntry.node);
        }
        reporter(propertyPath, cacheEntry.parent, cacheEntry.node, oldValue, undefined);
      } else {
        const { node, parent } = findNode(ast, p);
        if (node) {
          cache.set(propertyPath, { node, parent, value: undefined });
          alteredNodes.add(node);
          reporter(propertyPath, parent, node, node && node.value, undefined);
        }
      }

      return true;
    },
    defineProperty(target: {}, p: PropertyKey, attributes: PropertyDescriptor): boolean {
      if (typeof p === 'symbol') {
        return Reflect.defineProperty(target, p, attributes);
      }

      return false;
    },
    ownKeys(target: {}): PropertyKey[] {
      let keys: PropertyKey[];
      if (ast.kind === 'object') {
        keys = ast.properties
          .map(entry => entry.key.value)
          .filter(p => !excluded.has(p) && (!included || included.has(p)));
      } else {
        keys = [];
      }

      for (const key of cache.keys()) {
        const relativeKey = key.substr(path.length + 1);
        if (relativeKey.length > 0 && !relativeKey.includes('/')) {
          keys.push(unescapeKey(relativeKey));
        }
      }

      return [...new Set([...keys, ...Reflect.ownKeys(target)])];
    },
  });
}
