/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Suppresses the experimental warning emitted by Node.js for the `node:sqlite` module.
 *
 * This is a workaround to prevent the console from being cluttered with warnings
 * about the experimental status of the SQLite module, which is used by this tool.
 */
export function suppressSqliteWarning(): void {
  const originalProcessEmit = process.emit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.emit = function (event: string, error?: unknown): any {
    if (
      event === 'warning' &&
      error instanceof Error &&
      error.name === 'ExperimentalWarning' &&
      error.message.includes('SQLite')
    ) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-rest-params
    return originalProcessEmit.apply(process, arguments as any);
  };
}
