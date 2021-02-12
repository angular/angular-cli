/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { PathFragment, fragment, getSystemPath, virtualFs } from '@angular-devkit/core';
import { Stats } from 'fs';
import { InputFileSystem } from 'webpack';

// Host is used instead of ReadonlyHost due to most decorators only supporting Hosts
export function createWebpackInputHost(inputFileSystem: InputFileSystem) {
  return virtualFs.createSyncHost<Stats>({
    write() {
      throw new Error('Not supported.');
    },

    delete() {
      throw new Error('Not supported.');
    },

    rename() {
      throw new Error('Not supported.');
    },

    read(path): virtualFs.FileBuffer {
      // Synchronous functions are missing from the Webpack typings
      // tslint:disable-next-line: no-any
      const data = (inputFileSystem as any).readFileSync(getSystemPath(path));

      return new Uint8Array(data).buffer as ArrayBuffer;
    },

    list(path): PathFragment[] {
      // readdirSync exists but is not in the Webpack typings
      const names: string[] = ((inputFileSystem as unknown) as {
        readdirSync: (path: string) => string[];
      }).readdirSync(getSystemPath(path));

      return names.map((name) => fragment(name));
    },

    exists(path): boolean {
      return !!this.stat(path);
    },

    isDirectory(path): boolean {
      return this.stat(path)?.isDirectory() ?? false;
    },

    isFile(path): boolean {
      return this.stat(path)?.isFile() ?? false;
    },

    stat(path): Stats | null {
      try {
        // Synchronous functions are missing from the Webpack typings
        // tslint:disable-next-line: no-any
        return (inputFileSystem as any).statSync(getSystemPath(path));
      } catch (e) {
        if (e.code === 'ENOENT') {
          return null;
        }
        throw e;
      }
    },
  });
}
