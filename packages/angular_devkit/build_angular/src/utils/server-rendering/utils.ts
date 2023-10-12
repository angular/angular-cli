/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

const IGNORED_LOGS = new Set(['Angular is running in development mode.']);
const PATCHED_CONSOLE_SYMBOL = Symbol.for('Angular CLI Console Patched');

/** Method to filter a number of console.log from the output.
 * @returns a function that when invoked restores the default console.log behaviour.
 */
export function patchConsoleToIgnoreSpecificLogs(): () => void {
  /* eslint-disable no-console, @typescript-eslint/no-explicit-any */
  if (!(console as any)[PATCHED_CONSOLE_SYMBOL]) {
    const originalConsoleLog = console.log;

    console.log = (...args) => {
      if (!IGNORED_LOGS.has(args[0])) {
        originalConsoleLog.apply(args);
      }
    };

    (console as any)[PATCHED_CONSOLE_SYMBOL] = () => {
      console.log = originalConsoleLog;
      delete (console as any)[PATCHED_CONSOLE_SYMBOL];
    };
  }

  return (console as any)[PATCHED_CONSOLE_SYMBOL];
  /* eslint-enable no-console, @typescript-eslint/no-explicit-any */
}
