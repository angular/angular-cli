/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Schema } from '../schema';

export { describeBuilder } from '../../testing';

export const KARMA_BUILDER_INFO = Object.freeze({
  name: '@angular-devkit/build-angular:karma',
  schemaPath: __dirname + '/../schema.json',
});

/**
 * Contains all required karma builder fields.
 * Also disables progress reporting to minimize logging output.
 */
export const BASE_OPTIONS = Object.freeze<Schema>({
  main: 'src/test.ts',
  polyfills: 'src/polyfills.ts',
  tsConfig: 'src/tsconfig.spec.json',
  karmaConfig: 'karma.conf.js',
  browsers: 'ChromeHeadlessCI',
  progress: false,
  watch: false,
});
