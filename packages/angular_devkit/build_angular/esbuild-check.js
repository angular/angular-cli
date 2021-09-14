/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// If the platform does not support the native variant of esbuild, this will crash.
// This script can then be spawned by the CLI to determine if native usage is supported.
require('esbuild')
  .formatMessages([], { kind: 'error ' })
  .then(
    () => {},
    () => {},
  );
