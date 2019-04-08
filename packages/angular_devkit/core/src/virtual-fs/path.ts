/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '../exception';
import { TemplateTag } from '../utils/literals';


export class InvalidPathException extends BaseException {
  constructor(path: string) { super(`Path ${JSON.stringify(path)} is invalid.`); }
}
export class PathMustBeAbsoluteException extends BaseException {
  constructor(path: string) { super(`Path ${JSON.stringify(path)} must be absolute.`); }
}
export class PathCannotBeFragmentException extends BaseException {
  constructor(path: string) { super(`Path ${JSON.stringify(path)} cannot be made a fragment.`); }
}


/**
 * A Path recognized by most methods in the DevKit.
 */
export type Path = string & {
  __PRIVATE_DEVKIT_PATH: void;
};

/**
 * A Path fragment (file or directory name) recognized by most methods in the DevKit.
 */
export type PathFragment = Path & {
  __PRIVATE_DEVKIT_PATH_FRAGMENT: void;
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
export function split(path: Path): PathFragment[] {
  const fragments = path.split(NormalizedSep).map(x => fragment(x));
  if (fragments[fragments.length - 1].length === 0) {
    fragments.pop();
  }

  return fragments;
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
 * Return the basename of the path, as a Path. See path.basename
 */
export function basename(path: Path): PathFragment {
  const i = path.lastIndexOf(NormalizedSep);
  if (i == -1) {
    return fragment(path);
  } else {
    return fragment(path.substr(path.lastIndexOf(NormalizedSep) + 1));
  }
}


/**
 * Return the dirname of the path, as a Path. See path.dirname
 */
export function dirname(path: Path): Path {
  const index = path.lastIndexOf(NormalizedSep);
  if (index === -1) {
    return '' as Path;
  }

  const endIndex = index === 0 ? 1 : index; // case of file under root: '/file'

  return normalize(path.substr(0, endIndex));
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
    const splitFrom = split(from);
    const splitTo = split(to);

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


export function fragment(path: string): PathFragment {
  if (path.indexOf(NormalizedSep) != -1) {
    throw new PathCannotBeFragmentException(path);
  }

  return path as PathFragment;
}


/**
 * normalize() cache to reduce computation. For now this grows and we never flush it, but in the
 * future we might want to add a few cache flush to prevent this from growing too large.
 */
let normalizedCache = new Map<string, Path>();


/**
 * Reset the cache. This is only useful for testing.
 * @private
 */
export function resetNormalizeCache() {
  normalizedCache = new Map<string, Path>();
}


/**
 * Normalize a string into a Path. This is the only mean to get a Path type from a string that
 * represents a system path. This method cache the results as real world paths tend to be
 * duplicated often.
 * Normalization includes:
 *   - Windows backslashes `\\` are replaced with `/`.
 *   - Windows drivers are replaced with `/X/`, where X is the drive letter.
 *   - Absolute paths starts with `/`.
 *   - Multiple `/` are replaced by a single one.
 *   - Path segments `.` are removed.
 *   - Path segments `..` are resolved.
 *   - If a path is absolute, having a `..` at the start is invalid (and will throw).
 * @param path The path to be normalized.
 */
export function normalize(path: string): Path {
  let maybePath = normalizedCache.get(path);
  if (!maybePath) {
    maybePath = noCacheNormalize(path);
    normalizedCache.set(path, maybePath);
  }

  return maybePath;
}


/**
 * The no cache version of the normalize() function. Used for benchmarking and testing.
 */
export function noCacheNormalize(path: string): Path {
  if (path == '' || path == '.') {
    return '' as Path;
  } else if (path == NormalizedRoot) {
    return NormalizedRoot;
  }

  // Match absolute windows path.
  const original = path;
  if (path.match(/^[A-Z]:[\/\\]/i)) {
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
      } else if (i >= 2 && p[i - 1] != '..') {
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


export const path: TemplateTag<Path> = (strings, ...values) => {
  return normalize(String.raw(strings, ...values));
};


// Platform-specific paths.
export type WindowsPath = string & {
  __PRIVATE_DEVKIT_WINDOWS_PATH: void;
};
export type PosixPath = string & {
  __PRIVATE_DEVKIT_POSIX_PATH: void;
};

export function asWindowsPath(path: Path): WindowsPath {
  const drive = path.match(/^\/(\w)(?:\/(.*))?$/);
  if (drive) {
    const subPath = drive[2] ? drive[2].replace(/\//g, '\\') : '';

    return `${drive[1]}:\\${subPath}` as WindowsPath;
  }

  return path.replace(/\//g, '\\') as WindowsPath;
}

export function asPosixPath(path: Path): PosixPath {
  return path as string as PosixPath;
}

export function getSystemPath(path: Path): string {
  if (process.platform.startsWith('win32')) {
    return asWindowsPath(path);
  } else {
    return asPosixPath(path);
  }
}
