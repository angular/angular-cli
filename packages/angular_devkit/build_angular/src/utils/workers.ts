/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { cpus } from 'os';
/**
 * Use CPU count -1 with limit to 7 for workers not to clog the system.
 * Some environments, like CircleCI which use Docker report a number of CPUs by the host and not the count of available.
 * This cause `Error: Call retries were exceeded` errors when trying to use them.
 *
 * See:
 *
 * https://github.com/nodejs/node/issues/28762
 *
 * https://github.com/webpack-contrib/terser-webpack-plugin/issues/143
 *
 * https://github.com/angular/angular-cli/issues/16860#issuecomment-588828079
 *
 */
export const maxWorkers = Math.max(Math.min(cpus().length, 8) - 1, 1);
