/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { statSync } from 'fs';

export function isFile(filePath: string): boolean {
  let stat;
  try {
    stat = statSync(filePath);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
      return false;
    }
    throw e;
  }

  return stat.isFile() || stat.isFIFO();
}


export function isDirectory(filePath: string): boolean {
  let stat;
  try {
    stat = statSync(filePath);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
      return false;
    }
    throw e;
  }

  return stat.isDirectory();
}
