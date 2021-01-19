/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { promisify } from 'util';

export const readFile = promisify(fs.readFile);
export const access = promisify(fs.access);

export async function exists(path: fs.PathLike): Promise<boolean> {
  try {
    await access(path, fs.constants.F_OK);

    return true;
  } catch {
    return false;
  }
}
