/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { InputFileSystem } from 'webpack';
import { externalizePath } from './paths';

function shouldNotWrite(): never {
  throw new Error('Webpack TypeScript System should not write.');
}

export function createWebpackSystem(input: InputFileSystem, currentDirectory: string): ts.System {
  // Webpack's CachedInputFileSystem uses the default directory separator in the paths it uses
  // for keys to its cache. If the keys do not match then the file watcher will not purge outdated
  // files and cause stale data to be used in the next rebuild. TypeScript always uses a `/` (POSIX)
  // directory separator internally which is also supported with Windows system APIs. However,
  // if file operations are performed with the non-default directory separator, the Webpack cache
  // will contain a key that will not be purged. `externalizePath` ensures the paths are as expected.
  const system: ts.System = {
    ...ts.sys,
    readFile(path: string) {
      let data;
      try {
        data = input.readFileSync(externalizePath(path));
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
        return input.statSync(externalizePath(path)).size;
      } catch {
        return 0;
      }
    },
    fileExists(path: string) {
      try {
        return input.statSync(externalizePath(path)).isFile();
      } catch {
        return false;
      }
    },
    directoryExists(path: string) {
      try {
        return input.statSync(externalizePath(path)).isDirectory();
      } catch {
        return false;
      }
    },
    getModifiedTime(path: string) {
      try {
        return input.statSync(externalizePath(path)).mtime;
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
