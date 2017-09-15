/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';


export type SchematicPath = string & {
  __PRIVATE_SCHEMATIC_PATH: void;
};


export class InvalidPathException extends BaseException {
  constructor(path: string) { super(`Path "${path}" is invalid.`); }
}


export function relativePath(from: SchematicPath, to: SchematicPath): SchematicPath {
  let p: string;

  if (from == to) {
    p = '';
  } else {
    const splitFrom = from.split('/');
    const splitTo = to.split('/');

    while (splitFrom.length > 0 && splitTo.length > 0 && splitFrom[0] == splitTo[0]) {
      splitFrom.shift();
      splitTo.shift();
    }

    if (splitFrom.length == 0) {
      p = splitTo.join('/');
    } else {
      p = splitFrom.map(_ => '..').concat(splitTo).join('/');
    }
  }

  return (p as SchematicPath);
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
      .replace(/\/\.?\//g, '/')
      .replace(/\\/g, '/');
  }

  if (p.startsWith('/../') || (p.endsWith('/') && p !== '/')) {
    throw new InvalidPathException(path);
  }

  return (p as SchematicPath);
}
