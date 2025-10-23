/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { exec } from 'child_process';
import { promisify } from 'util';

/**
 * A promisified version of the Node.js `exec` function.
 * This is isolated in its own file to allow for easy mocking in tests.
 */
export const execAsync = promisify(exec);
