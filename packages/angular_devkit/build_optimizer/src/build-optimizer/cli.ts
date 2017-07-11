#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { join } from 'path';

import { buildOptimizer } from './build-optimizer';


if (process.argv.length < 3 || process.argv.length > 4) {
  throw new Error(`
    ngo should be called with either one or two arguments:

      ngo input.js
      ngo input.js output.js
  `);
}

const currentDir = process.cwd();

const inputFile = process.argv[2];
const tsOrJsRegExp = /\.(j|t)s$/;

if (!inputFile.match(tsOrJsRegExp)) {
  throw new Error(`Input file must be .js or .ts.`);
}

// Use provided output file, or add the .ngo suffix before the extension.
const outputFile = process.argv[3] || inputFile.replace(tsOrJsRegExp, (subStr) => `.ngo${subStr}`);

const ngoOutput = buildOptimizer({
  inputFilePath: join(currentDir, inputFile),
  outputFilePath: join(currentDir, outputFile),
  emitSourceMap: true,
});

writeFileSync(join(currentDir, outputFile), ngoOutput.content);
writeFileSync(join(currentDir, `${outputFile}.map`), JSON.stringify(ngoOutput.sourceMap));
