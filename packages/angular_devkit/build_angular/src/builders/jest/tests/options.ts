/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JestBuilderOptions } from '../options';

/** Default options to use for most tests. */
export const BASE_OPTIONS = Object.freeze<JestBuilderOptions>({
  include: ['**/*.spec.ts'],
  exclude: [],
  tsConfig: 'tsconfig.spec.json',
});
