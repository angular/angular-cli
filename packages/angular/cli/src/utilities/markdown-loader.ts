/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFileSync } from 'node:fs';

const LONG_DESCRIPTION_REGEXP = /[/\\]long-description\.md$/;

function isCommandLongDescription(filePath: string | undefined): boolean {
  return !!filePath && LONG_DESCRIPTION_REGEXP.test(filePath);
}

// Register markdown extension hook for CommonJS execution
if (typeof require !== 'undefined' && require.extensions) {
  const originalMdExtension = require.extensions['.md'];
  require.extensions['.md'] = (module, filename) => {
    if (isCommandLongDescription(filename)) {
      module.exports = readFileSync(filename, 'utf8');

      return;
    }

    if (originalMdExtension) {
      originalMdExtension(module, filename);
    } else {
      const err = new Error(`Cannot find module '${filename}'`);
      (err as NodeJS.ErrnoException).code = 'MODULE_NOT_FOUND';
      throw err;
    }
  };
}
