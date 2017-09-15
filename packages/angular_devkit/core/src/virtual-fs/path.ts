/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';


export class InvalidPathException extends BaseException {
  constructor(path: string) { super(`Path ${JSON.stringify(path)} is invalid.`); }
}
export class PathMustBeAbsoluteException extends BaseException {
  constructor(path: string) { super(`Path ${JSON.stringify(path)} must be absolute.`); }
}


/**
 * A Path recognized by most methods in the DevKit.
 */
export type Path = string & {
  __PRIVATE_DEVKIT_PATH: void;
};


/**
 * The Separator for normalized path.
 * @type {Path}
 */
export const NormalizedSep = '/' as Path;


/**
 * The root of a normalized path.
 * @type {Path}
 */
export const NormalizedRoot = NormalizedSep as Path;


/**
 * Split a path into multiple path fragments. Each fragments except the last one will end with
 * a path separator.
 * @param {Path} path The path to split.
 * @returns {Path[]} An array of path fragments.
 */
export function split(path: Path): Path[] {
  const arr = path.split(NormalizedSep);

  return arr.map((fragment, i) => fragment + (i < arr.length - 1 ? NormalizedSep : '')) as Path[];
}

/**
 *
 */
export function extname(path: Path): string {
  const base = basename(path);
  const i = base.lastIndexOf('.');
  if (i < 1) {
    return '';
  } else {
    return base.substr(i);
  }
}

/**
 * This is the equivalent of calling dirname() over and over, until the root, then getting the
 * basename.
 *
 * @example rootname('/a/b/c') == 'a'
 * @example rootname('a/b') == '.'
 * @param path The path to get the rootname from.
 * @returns {Path} The first directory name.
 */
export function rootname(path: Path): Path {
  const i = path.indexOf(NormalizedSep);
  if (!isAbsolute(path)) {
    return '.' as Path;
  } else if (i == -1) {
    return path;
  } else {
    return path.substr(path.lastIndexOf(NormalizedSep) + 1) as Path;
  }
}


/**
 * Return the basename of the path, as a Path. See path.basename
 */
export function basename(path: Path): Path {
  const i = path.lastIndexOf(NormalizedSep);
  if (i == -1) {
    return path;
  } else {
    return path.substr(path.lastIndexOf(NormalizedSep) + 1) as Path;
  }
}


/**
 * Return the dirname of the path, as a Path. See path.dirname
 */
export function dirname(path: Path): Path {
  const i = path.lastIndexOf(NormalizedSep);
  if (i == -1) {
    return '' as Path;
  } else {
    return normalize(path.substr(0, i));
  }
}


/**
 * Join multiple paths together, and normalize the result. Accepts strings that will be
 * normalized as well (but the original must be a path).
 */
export function join(p1: Path, ...others: string[]): Path {
  if (others.length > 0) {
    return normalize((p1 ? p1 + NormalizedSep : '') + others.join(NormalizedSep));
  } else {
    return p1;
  }
}


/**
 * Returns true if a path is absolute.
 */
export function isAbsolute(p: Path) {
  return p.startsWith(NormalizedSep);
}


/**
 * Returns a path such that `join(from, relative(from, to)) == to`.
 * Both paths must be absolute, otherwise it does not make much sense.
 */
export function relative(from: Path, to: Path): Path {
  if (!isAbsolute(from)) {
    throw new PathMustBeAbsoluteException(from);
  }
  if (!isAbsolute(to)) {
    throw new PathMustBeAbsoluteException(to);
  }

  let p: string;

  if (from == to) {
    p = '';
  } else {
    const splitFrom = from.split(NormalizedSep);
    const splitTo = to.split(NormalizedSep);

    while (splitFrom.length > 0 && splitTo.length > 0 && splitFrom[0] == splitTo[0]) {
      splitFrom.shift();
      splitTo.shift();
    }

    if (splitFrom.length == 0) {
      p = splitTo.join(NormalizedSep);
    } else {
      p = splitFrom.map(_ => '..').concat(splitTo).join(NormalizedSep);
    }
  }

  return normalize(p);
}


/**
 * Returns a Path that is the resolution of p2, from p1. If p2 is absolute, it will return p2,
 * otherwise will join both p1 and p2.
 */
export function resolve(p1: Path, p2: Path) {
  if (isAbsolute(p2)) {
    return p2;
  } else {
    return join(p1, p2);
  }
}


/**
 * Normalize a string into a Path. This is the only mean to get a Path type from a string that
 * represents a system path. Normalization includes:
 *   - Windows backslashes `\\` are replaced with `/`.
 *   - Windows drivers are replaced with `/X/`, where X is the drive letter.
 *   - Absolute paths starts with `/`.
 *   - Multiple `/` are replaced by a single one.
 *   - Path segments `.` are removed.
 *   - Path segments `..` are resolved.
 *   - If a path is absolute, having a `..` at the start is invalid (and will throw).
 */
export function normalize(path: string): Path {
  if (path == '' || path == '.') {
    return '' as Path;
  } else if (path == NormalizedRoot) {
    return NormalizedRoot;
  }

  // Match absolute windows path.
  const original = path;
  if (path.match(/^[A-Z]:\\/)) {
    path = '\\' + path[0] + '\\' + path.substr(3);
  }

  // We convert Windows paths as well here.
  const p = path.split(/[\/\\]/g);
  let relative = false;
  let i = 1;

  // Special case the first one.
  if (p[0] != '') {
    p.unshift('.');
    relative = true;
  }

  while (i < p.length) {
    if (p[i] == '.') {
      p.splice(i, 1);
    } else if (p[i] == '..') {
      if (i < 2 && !relative) {
        throw new InvalidPathException(original);
      } else if (i >= 2) {
        p.splice(i - 1, 2);
        i--;
      } else {
        i++;
      }
    } else if (p[i] == '') {
      p.splice(i, 1);
    } else {
      i++;
    }
  }

  if (p.length == 1) {
    return p[0] == '' ? NormalizedSep : '' as Path;
  } else {
    if (p[0] == '.') {
      p.shift();
    }

    return p.join(NormalizedSep) as Path;
  }
}
