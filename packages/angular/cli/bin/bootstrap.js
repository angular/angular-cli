/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 *
 * This file is used to bootstrap the CLI process by dynamically importing the main initialization code.
 * This is done to allow the main bin file (`ng`) to remain CommonJS so that older versions of Node.js
 * can be checked and validated prior to the execution of the CLI. This separate bootstrap file is
 * needed to allow the use of a dynamic import expression without crashing older versions of Node.js that
 * do not support dynamic import expressions and would otherwise throw a syntax error. This bootstrap file
 * is required from the main bin file only after the Node.js version is determined to be in the supported
 * range.
 */

// Enable on-disk code caching if available (Node.js 22.8+)
// Skip if running inside Bazel via a RUNFILES environment variable check. The cache does not work
// well with Bazel's hermeticity requirements.
if (!process.env['RUNFILES']) {
  try {
    const { enableCompileCache } = require('node:module');

    enableCompileCache?.();
  } catch {}
}

// Initialize the Angular CLI
void import('../lib/init.js');
