#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { purify } from './purify';


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

// Use provided output file, or add the .ngo suffix before the extension.
const outputFile = process.argv[3]
  || inputFile.replace(tsOrJsRegExp, (subStr) => `.purify${subStr}`);

const purifyOutput = purify(readFileSync(join(currentDir, inputFile), 'UTF-8'));

writeFileSync(join(currentDir, outputFile), purifyOutput);
