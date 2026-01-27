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
import { dirname, extname, join, relative } from 'node:path';
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
        bin: { prettier: string };
      };
      prettierCliPath = join(dirname(prettierPath), prettierPackageJson.bin.prettier);
    } catch {
      // Prettier is not installed.
      prettierCliPath = null;
    }
  }

  if (!prettierCliPath) {
    return;
  }

  await execFileAsync(prettierCliPath, [
    '--write',
    ...[...files].filter((f) => fileTypes.has(extname(f))).map((f) => relative(cwd, f)),
  ]);
}
