/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ɵConsole } from '@angular/core';

/**
 * A set of log messages that should be ignored and not printed to the console.
 */
const IGNORED_LOGS = new Set(['Angular is running in development mode.']);

/**
 * Custom implementation of the Angular Console service that filters out specific log messages.
 *
 * This class extends the internal Angular `ɵConsole` class to provide customized logging behavior.
 * It overrides the `log` method to suppress logs that match certain predefined messages.
 */
export class Console extends ɵConsole {
  /**
   * Logs a message to the console if it is not in the set of ignored messages.
   *
   * @param message - The message to log to the console.
   *
   * This method overrides the `log` method of the `ɵConsole` class. It checks if the
   * message is in the `IGNORED_LOGS` set. If it is not, it delegates the logging to
   * the parent class's `log` method. Otherwise, the message is suppressed.
   */
  override log(message: string): void {
    if (!IGNORED_LOGS.has(message)) {
      super.log(message);
    }
  }
}
