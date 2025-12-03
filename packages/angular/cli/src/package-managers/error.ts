/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file defines a custom error class for the package manager
 * abstraction. This allows for structured error handling and provides consumers
 * with detailed information about the process failure.
 */

/**
 * A custom error class for package manager-related errors.
 *
 * This error class provides structured data about the failed process,
 * including stdout, stderr, and the exit code.
 */
export class PackageManagerError extends Error {
  /**
   * Creates a new `PackageManagerError` instance.
   * @param message The error message.
   * @param stdout The standard output of the failed process.
   * @param stderr The standard error of the failed process.
   * @param exitCode The exit code of the failed process.
   */
  constructor(
    message: string,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly exitCode: number | null,
  ) {
    super(message);
  }
}

/**
 * Represents structured information about an error returned by a package manager command.
 * This is a data interface, not an `Error` subclass.
 */
export interface ErrorInfo {
  /** A specific error code (e.g. 'E404', 'EACCES'). */
  readonly code: string;

  /** A short, human-readable summary of the error. */
  readonly summary: string;

  /** An optional, detailed description of the error. */
  readonly detail?: string;
}
