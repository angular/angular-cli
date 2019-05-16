/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonPointer } from './interface';


export function buildJsonPointer(fragments: string[]): JsonPointer {
  return (
    '/' + fragments.map(f => {
      return f.replace(/~/g, '~0')
              .replace(/\//g, '~1');
    }).join('/')
  ) as JsonPointer;
}
export function joinJsonPointer(root: JsonPointer, ...others: string[]): JsonPointer {
  if (root == '/') {
    return buildJsonPointer(others);
  }

  return (root + buildJsonPointer(others)) as JsonPointer;
}
export function parseJsonPointer(pointer: JsonPointer): string[] {
  if (pointer === '') { return []; }
  if (pointer.charAt(0) !== '/') { throw new Error('Relative pointer: ' + pointer); }

  return pointer.substring(1).split(/\//).map(str => str.replace(/~1/g, '/').replace(/~0/g, '~'));
}
