/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { workerData } from 'node:worker_threads';

let IS_NODE_18: boolean | undefined;
function isNode18(): boolean {
  return (IS_NODE_18 ??= process.versions.node.startsWith('18.'));
}

/** Call the initialize hook when running on Node.js 18 */
export function callInitializeIfNeeded(
  initialize: (typeof import('./loader-hooks'))['initialize'],
): void {
  if (isNode18()) {
    initialize(workerData);
  }
}

export function getESMLoaderArgs(): string[] {
  if (isNode18()) {
    return [
      '--no-warnings', // Suppress `ExperimentalWarning: Custom ESM Loaders is an experimental feature...`.
      '--loader',
      pathToFileURL(join(__dirname, 'loader-hooks.js')).href, // Loader cannot be an absolute path on Windows.
    ];
  }

  return [
    '--import',
    pathToFileURL(join(__dirname, 'register-hooks.js')).href, // Loader cannot be an absolute path on Windows.
  ];
}
