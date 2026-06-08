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
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
let prettierCliPath: string | null | undefined;

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

  await execFileAsync(
    process.execPath,
    [prettierCliPath, '--write', '--no-error-on-unmatched-pattern', '--ignore-unknown', ...files],
    {
      cwd,
      shell: false,
    },
  );
}
