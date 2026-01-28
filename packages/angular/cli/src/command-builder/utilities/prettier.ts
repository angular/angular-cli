/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { platform } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
let prettierCliPath: string | null | undefined;

/**
 * File types that can be formatted using Prettier.
 */
const fileTypes: ReadonlySet<string> = new Set([
  '.ts',
  '.html',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.less',
  '.scss',
  '.sass',
]);

/**
 * Formats files using Prettier.
 * @param cwd The current working directory.
 * @param files The files to format.
 */
export async function formatFiles(cwd: string, files: Set<string>): Promise<void> {
  if (!files.size) {
    return;
  }

  if (prettierCliPath === undefined) {
    try {
      const prettierPath = createRequire(cwd + '/').resolve('prettier/package.json');
      const prettierPackageJson = JSON.parse(await readFile(prettierPath, 'utf-8')) as {
        bin: string;
      };
      prettierCliPath = join(dirname(prettierPath), prettierPackageJson.bin);
    } catch {
      // Prettier is not installed.
      prettierCliPath = null;
    }
  }

  if (!prettierCliPath) {
    return;
  }

  const filesToFormat: string[] = [];
  for (const file of files) {
    if (fileTypes.has(extname(file))) {
      filesToFormat.push(file);
    }
  }

  if (!filesToFormat.length) {
    return;
  }

  await execFileAsync(
    prettierCliPath,
    ['--write', '--no-error-on-unmatched-pattern', ...filesToFormat],
    {
      cwd,
      shell: platform() === 'win32',
    },
  );
}
