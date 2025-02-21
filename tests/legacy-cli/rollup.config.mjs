/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import glob from 'fast-glob';

const testFiles = [
  'e2e_runner.js',
  'e2e/utils/test_process.js',
  ...glob.sync('e2e/(initialize|setup|tests)/**/*.js'),
];

// Generate chunks to keep the original folder structure.
// Needed as we dynamically load these files.
const chunks = {};
for (const file of testFiles) {
  chunks[file.slice(0, -'.js'.length)] = file;
}

export default {
  input: chunks,
  external: [],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      browser: false,
    }),
    json(),
    commonjs({
      // Test runner uses dynamic requires, and those are fine.
      // Rollup should not try to process them.
      ignoreDynamicRequires: true,
    }),
  ],
  output: {
    dir: './runner_bundled_out',
    exports: 'auto',
  },
};
