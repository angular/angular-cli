#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { parseArgs, styleText } from 'node:util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    verbose: {
      type: 'boolean',
    },
  },
  allowPositionals: true,
  strict: false, // Allow unknown options to pass through.
});

const scriptName = positionals.shift();
const args = {
  ...values,
  _: positionals,
};

const cwd = process.cwd();
const scriptDir = import.meta.dirname;
process.chdir(path.join(scriptDir, '..'));

const originalConsole = { ...console };
console.warn = function (...args) {
  if (typeof args[0] === 'string') {
    args[0] = styleText(['yellow'], args[0]);
  }
  originalConsole.warn(...args);
};
console.error = function (...args) {
  if (typeof args[0] === 'string') {
    args[0] = styleText(['red'], args[0]);
  }
  originalConsole.error(...args);
};

try {
  const script = await import(`./${scriptName}.mts`);
  const exitCode = await script.default(args, cwd);
  process.exitCode = typeof exitCode === 'number' ? exitCode : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} catch (err: any) {
  console.error(err.stack ?? err);
  process.exitCode = 99;
}
