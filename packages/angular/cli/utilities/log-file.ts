/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { appendFileSync, mkdtempSync, realpathSync } from 'fs';
import { tmpdir } from 'os';
import { normalize } from 'path';

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
