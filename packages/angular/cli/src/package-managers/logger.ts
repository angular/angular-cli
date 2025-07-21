/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file defines a basic logger interface that is used by
 * the package manager abstraction. This allows the abstraction to be decoupled
 * from any specific logging implementation.
 */

/**
 * A basic logger interface for the package manager abstraction.
 */
export interface Logger {
  /**
   * Logs a debug message.
   * @param message The message to log.
   */
  debug(message: string): void;

  /**
   * Logs an informational message.
   * @param message The message to log.
   */
  info(message: string): void;
}
