/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const IMPORT_EXEC_ARGV =
  '--import=' + pathToFileURL(join(__dirname, 'register-hooks.js')).href;
