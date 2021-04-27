/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { promisify } from 'util';

export const mkdir = promisify(fs.mkdir);
export const readFile = promisify(fs.readFile);
export const writeFile = promisify(fs.writeFile);
