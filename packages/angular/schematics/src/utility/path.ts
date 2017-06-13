/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {BaseException} from '../exception/exception';


export type SchematicPath = string & {
  __PRIVATE_SCHEMATIC_PATH: void;
};


export class InvalidPathException extends BaseException {
  constructor(path: string) { super(`Path "${path}" is invalid.`); }
}


export function normalizePath(path: string): SchematicPath {
  let p = path;
  if (p[0] != '/') {
    p = '/' + p;
  }
  if (p.endsWith('..')) {
    throw new InvalidPathException(path);
  }

  let oldP: string | null = null;
  while (oldP !== p) {
    oldP = p;
    p = p
      .replace(/\/[^\/]+\/\.\.\//g, '/')
      .replace(/\/[^\/]+\/\.\.$/g, '/')
      .replace(/\/\.?$/g, '/')
      .replace(/\/\.?\//g, '/');
  }

  if (p.startsWith('/../') || (p.endsWith('/') && p !== '/')) {
    throw new InvalidPathException(path);
  }
  return (p as SchematicPath);
}
