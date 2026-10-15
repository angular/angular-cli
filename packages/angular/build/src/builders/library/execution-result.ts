/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderOutput } from '@angular-devkit/architect';

/**
 * Encapsulates the diagnostic messages (`errors`, `warnings`, and `logs`) and
 * builder output status for a single library build iteration.
 */
export class ExecutionResult {
  readonly #errors: string[] = [];
  readonly #warnings: string[] = [];
  readonly #logs: string[] = [];

  /** Formatted error messages produced during the build iteration. */
  get errors(): readonly string[] {
    return this.#errors;
  }

  /** Formatted warning messages produced during the build iteration. */
  get warnings(): readonly string[] {
    return this.#warnings;
  }

  /** Informational log messages produced during the build iteration. */
  get logs(): readonly string[] {
    return this.#logs;
  }

  /** Whether any errors have been recorded in the build iteration. */
  get hasErrors(): boolean {
    return this.#errors.length > 0;
  }

  /** Architect builder output status for the build iteration. */
  get output(): BuilderOutput {
    return {
      success: !this.hasErrors,
    };
  }

  /** Records an informational log message. */
  addLog(value: string): void {
    this.#logs.push(value);
  }

  /** Records a formatted error message. */
  addError(error: string): void {
    this.#errors.push(error);
  }

  /** Records multiple formatted error messages. */
  addErrors(errors: Iterable<string>): void {
    for (const error of errors) {
      this.#errors.push(error);
    }
  }

  /** Records a formatted warning message. */
  addWarning(warning: string): void {
    this.#warnings.push(warning);
  }

  /** Records multiple formatted warning messages. */
  addWarnings(warnings: Iterable<string>): void {
    for (const warning of warnings) {
      this.#warnings.push(warning);
    }
  }
}
