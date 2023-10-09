/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: remove the below once @types/node are version 20.x.x
// @ts-expect-error "node:module"' has no exported member 'register'.ts(2305)
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { workerData } from 'node:worker_threads';

register('./loader-hooks.js', pathToFileURL(__filename), { data: workerData });
