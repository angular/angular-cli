/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Schema } from '../schema';

// TODO: Consider using package.json imports field instead of relative path
//       after the switch to rules_js.
export * from '../../../../../../../modules/testing/builder/src';

export const APPLICATION_BUILDER_INFO = Object.freeze({
  name: '@angular/build:application',
  schemaPath: __dirname + '/../schema.json',
});

/**
 * Contains all required browser builder fields.
 * Also disables progress reporting to minimize logging output.
 */
export const BASE_OPTIONS = Object.freeze<Schema>({
  index: 'src/index.html',
  browser: 'src/main.ts',
  outputPath: 'dist',
  tsConfig: 'src/tsconfig.app.json',
  progress: false,

  // Disable optimizations
  optimization: false,

  // Enable polling (if a test enables watch mode).
  // This is a workaround for bazel isolation file watch not triggering in tests.
  poll: 100,
});
