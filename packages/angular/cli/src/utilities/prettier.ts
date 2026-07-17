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
 * Conservative upper bound for the length of a single spawned command line.
 * Windows caps `CreateProcess` command lines at 32,767 characters; POSIX `ARG_MAX`
 * is larger. Staying below this budget avoids `E2BIG`/`ENAMETOOLONG` when a large
 * migration changes thousands of files.
 */
const MAX_COMMAND_LINE_LENGTH = 32_000;

/**
 * Groups files into batches whose combined argument length (including `baseLength`
 * for the fixed leading arguments) stays under `maxLength`. A file longer on its own
 * than the budget still gets its own batch, so files are never dropped.
 */
export function batchFilesByArgumentLength(
  files: Iterable<string>,
  baseLength: number,
  maxLength: number,
): string[][] {
  const batches: string[][] = [];
  let batch: string[] = [];
  let length = baseLength;

  for (const file of files) {
    // Account for the separator between arguments, plus the surrounding quotes the OS
    // adds to paths containing spaces when they are spawned.
    const fileLength = file.length + (file.includes(' ') ? 3 : 1);

    if (batch.length > 0 && length + fileLength > maxLength) {
      batches.push(batch);
      batch = [];
      length = baseLength;
    }

    batch.push(file);
    length += fileLength;
  }

  if (batch.length > 0) {
    batches.push(batch);
  }

  return batches;
}

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

  const baseArgs = [
    prettierCliPath,
    '--write',
    '--no-error-on-unmatched-pattern',
    '--ignore-unknown',
  ];
  // `process.execPath` is spawned as the first argument and also counts toward the
  // command-line limit; it and `prettierCliPath` are absolute paths that may contain
  // spaces and therefore be quoted.
  const baseLength = [process.execPath, ...baseArgs].reduce(
    (total, arg) => total + arg.length + (arg.includes(' ') ? 3 : 1),
    0,
  );

  // Spawn Prettier once per batch so repositories with many changed files do not
  // overflow the OS command-line length limit. A failure in one batch (e.g. a file
  // Prettier cannot parse) must not stop the remaining batches, matching the previous
  // single-invocation behavior, so errors are collected and reported together.
  const errors: string[] = [];
  for (const batch of batchFilesByArgumentLength(files, baseLength, MAX_COMMAND_LINE_LENGTH)) {
    try {
      await execFileAsync(process.execPath, [...baseArgs, ...batch], {
        cwd,
        shell: false,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}
