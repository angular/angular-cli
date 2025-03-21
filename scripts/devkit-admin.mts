#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import colors from 'ansi-colors';
import path from 'node:path';
import yargsParser from 'yargs-parser';

const args = yargsParser(process.argv.slice(2), {
  boolean: ['verbose'],
  configuration: {
    'camel-case-expansion': false,
  },
});
const scriptName = args._.shift();

const cwd = process.cwd();
const scriptDir = import.meta.dirname;
process.chdir(path.join(scriptDir, '..'));

const originalConsole = { ...console };
console.warn = function (...args) {
  const [m, ...rest] = args;
  originalConsole.warn(colors.yellow(m), ...rest);
};
console.error = function (...args) {
  const [m, ...rest] = args;
  originalConsole.error(colors.red(m), ...rest);
};

try {
  const script = await import(`./${scriptName}.mjs`);
  const exitCode = await script.default(args, cwd);
  process.exitCode = typeof exitCode === 'number' ? exitCode : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} catch (err: any) {
  console.error(err.stack);
  process.exitCode = 99;
}
