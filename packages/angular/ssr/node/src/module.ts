/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * Determines whether the provided URL represents the main entry point module.
 *
 * This function checks if the provided URL corresponds to the main ESM module being executed directly.
 * It's useful for conditionally executing code that should only run when a module is the entry point,
 * such as starting a server or initializing an application.
 *
 * It performs two key checks:
 * 1. Verifies if the URL starts with 'file:', ensuring it is a local file.
 * 2. Compares the URL's resolved file path with the first command-line argument (`process.argv[1]`),
 *    which points to the file being executed.
 *
 * @param url The URL of the module to check. This should typically be `import.meta.url`.
 * @returns `true` if the provided URL represents the main entry point, otherwise `false`.
 */
export function isMainModule(url: string): boolean {
  return url.startsWith('file:') && argv[1] === fileURLToPath(url);
}
