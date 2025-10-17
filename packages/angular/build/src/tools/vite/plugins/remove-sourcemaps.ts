/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'vite';

export const removeSourceMapsPlugin: Plugin = {
  name: 'vite:angular-remove-sourcemaps',
  transform(code) {
    return {
      code,
      map: { mappings: '' },
    };
  },
};
