#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { buildOptimizer } from './build-optimizer';

// tslint:disable: no-console
if (process.argv.length < 3 || process.argv.length > 4) {
  throw new Error(`
    build-optimizer should be called with either one or two arguments:

      build-optimizer input.js
      build-optimizer input.js output.js
  `);
}

const currentDir = process.cwd();

const inputFile = process.argv[2];
const tsOrJsRegExp = /\.(j|t)s$/;

if (!inputFile.match(tsOrJsRegExp)) {
  throw new Error(`Input file must be .js or .ts.`);
}

// Use provided output file, or add the .bo suffix before the extension.
const outputFile = process.argv[3] || inputFile.replace(tsOrJsRegExp, subStr => `.bo${subStr}`);

const boOutput = buildOptimizer({
  inputFilePath: join(currentDir, inputFile),
  outputFilePath: join(currentDir, outputFile),
  emitSourceMap: true,
});

if (boOutput.emitSkipped) {
  console.log('Nothing to emit.');
} else {
  writeFileSync(join(currentDir, outputFile), boOutput.content);
  writeFileSync(join(currentDir, `${outputFile}.map`), JSON.stringify(boOutput.sourceMap));
  console.log('Emitted:');
  console.log(`  ${outputFile}`);
  console.log(`  ${outputFile}.map`);
}
