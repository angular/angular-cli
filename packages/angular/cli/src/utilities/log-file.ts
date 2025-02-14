/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { appendFileSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { normalize } from 'node:path';

let logPath: string | undefined;

/**
 * Writes an Error to a temporary log file.
 * If this method is called multiple times from the same process the same log file will be used.
 * @returns The path of the generated log file.
 */
export function writeErrorToLogFile(error: Error): string {
  if (!logPath) {
    const tempDirectory = mkdtempSync(realpathSync(tmpdir()) + '/ng-');
    logPath = normalize(tempDirectory + '/angular-errors.log');
  }

  appendFileSync(logPath, '[error] ' + (error.stack || error) + '\n\n');

  return logPath;
}
