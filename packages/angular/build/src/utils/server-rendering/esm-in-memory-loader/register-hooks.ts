/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { registerHooks } from 'node:module';
import { workerData } from 'node:worker_threads';
import { initialize, load, resolve } from './loader-hooks';

initialize(workerData);
registerHooks({ resolve, load });
