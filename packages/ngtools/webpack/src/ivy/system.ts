/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { InputFileSystem } from 'webpack';

function shouldNotWrite(): never {
  throw new Error('Webpack TypeScript System should not write.');
}

// Webpack's CachedInputFileSystem uses the default directory separator in the paths it uses
// for keys to its cache. If the keys do not match then the file watcher will not purge outdated
// files and cause stale data to be used in the next rebuild. TypeScript always uses a `/` (POSIX)
// directory separator internally which is also supported with Windows system APIs. However,
// if file operations are performed with the non-default directory separator, the Webpack cache
// will contain a key that will not be purged.
function createToSystemPath(): (path: string) => string {
  if (process.platform === 'win32') {
    const cache = new Map<string, string>();

    return (path) => {
      let value = cache.get(path);
      if (value === undefined) {
        value = path.replace(/\//g, '\\');
        cache.set(path, value);
      }

      return value;
    };
  }

  // POSIX-like platforms retain the existing directory separator
  return (path) => path;
}

export function createWebpackSystem(input: InputFileSystem, currentDirectory: string): ts.System {
  const toSystemPath = createToSystemPath();

  const system: ts.System = {
    ...ts.sys,
    readFile(path: string) {
      let data;
      try {
        data = input.readFileSync(toSystemPath(path));
      } catch {
        return undefined;
      }

      // Strip BOM if present
      let start = 0;
      if (data.length > 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
        start = 3;
      }

      return data.toString('utf8', start);
    },
    getFileSize(path: string) {
      try {
        return input.statSync(toSystemPath(path)).size;
      } catch {
        return 0;
      }
    },
    fileExists(path: string) {
      try {
        return input.statSync(toSystemPath(path)).isFile();
      } catch {
        return false;
      }
    },
    directoryExists(path: string) {
      try {
        return input.statSync(toSystemPath(path)).isDirectory();
      } catch {
        return false;
      }
    },
    getModifiedTime(path: string) {
      try {
        return input.statSync(toSystemPath(path)).mtime;
      } catch {
        return undefined;
      }
    },
    getCurrentDirectory() {
      return currentDirectory;
    },
    writeFile: shouldNotWrite,
    createDirectory: shouldNotWrite,
    deleteFile: shouldNotWrite,
    setModifiedTime: shouldNotWrite,
  };

  return system;
}
