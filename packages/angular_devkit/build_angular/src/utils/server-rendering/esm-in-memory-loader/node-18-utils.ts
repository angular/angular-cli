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
import { satisfies } from 'semver';

let SUPPORTS_IMPORT_FLAG: boolean | undefined;
function supportsImportFlag(): boolean {
  return (SUPPORTS_IMPORT_FLAG ??= satisfies(process.versions.node, '>= 18.19'));
}

/** Call the initialize hook when running on Node.js 18 */
export function callInitializeIfNeeded(
  initialize: (typeof import('./loader-hooks'))['initialize'],
): void {
  if (!supportsImportFlag()) {
    initialize(workerData);
  }
}

export function getESMLoaderArgs(): string[] {
  if (!supportsImportFlag()) {
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
