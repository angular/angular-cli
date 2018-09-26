/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { JsonValue } from './interface';

export function stableStringify<T extends JsonValue>(data: T): string {
  const seen: {}[] = [];

  function recursive(node: JsonValue): string {
    if (typeof node == 'object'
        && !Array.isArray(node)
        && node
        && node.toJSON
        && typeof node.toJSON === 'function') {
      node = (node as {} as { toJSON: Function }).toJSON();
    }

    if (node === undefined) {
      return '';
    }
    if (typeof node == 'number') {
      return isFinite(node) ? '' + node : 'null';
    }
    if (typeof node !== 'object') {
      return JSON.stringify(node);
    }

    if (Array.isArray(node)) {
      return `[${node.map(x => recursive(x) || 'null').join(',')}]`;
    }

    if (node === null) {
      return 'null';
    }

    if (seen.indexOf(node) !== -1) {
      throw new TypeError('Converting circular structure to JSON');
    }

    const seenIndex = seen.push(node) - 1;
    const keys = Object.keys(node).sort();

    let out = '';
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = recursive(node[key]);

      if (!value) {
        continue;
      }
      if (out) {
        out += ',';
      }
      out += JSON.stringify(key) + ':' + value;
    }
    seen.splice(seenIndex, 1);

    return '{' + out + '}';
  }

  return recursive(data);
}
