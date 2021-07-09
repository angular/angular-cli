/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Schema } from '../schema';

export { describeBuilder } from '../../testing';

export const SERVER_BUILDER_INFO = Object.freeze({
  name: '@angular-devkit/build-angular:server',
  schemaPath: __dirname + '/../schema.json',
});

/**
 * Contains all required Server builder fields.
 * Also disables progress reporting to minimize logging output.
 */
export const BASE_OPTIONS = Object.freeze<Schema>({
  main: 'src/main.server.ts',
  tsConfig: 'src/tsconfig.server.json',
  progress: false,
  watch: false,
  outputPath: 'dist',
});
