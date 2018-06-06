#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { purify } from './purify';

console.warn('purify is deprecated and will be removed in 0.7.0.');

if (process.argv.length < 3 || process.argv.length > 4) {
  throw new Error(`
    purify should be called with either one or two arguments:

      purify input.js
      purify input.js output.js
  `);
}

const currentDir = process.cwd();

const inputFile = process.argv[2];
const tsOrJsRegExp = /\.(j|t)s$/;

if (!inputFile.match(tsOrJsRegExp)) {
  throw new Error(`Input file must be .js or .ts.`);
}

// Use provided output file, or add the .purify suffix before the extension.
const outputFile = process.argv[3]
  || inputFile.replace(tsOrJsRegExp, (subStr) => `.purify${subStr}`);

const purifyOutput = purify(readFileSync(join(currentDir, inputFile), 'UTF-8'));

writeFileSync(join(currentDir, outputFile), purifyOutput);
console.log(`Emitted: ${outputFile}`);
