/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRequire } from 'node:module';

/**
 * A custom error class to represent missing dependency errors.
 * This is used to avoid printing a stack trace for this expected error.
 */
export class MissingDependenciesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingDependenciesError';
  }
}

type Resolver = (packageName: string) => string;

export class DependencyChecker {
  private readonly resolver: Resolver;
  private readonly missingDependencies = new Set<string>();

  constructor(projectSourceRoot: string) {
    this.resolver = createRequire(projectSourceRoot + '/').resolve;
  }

  /**
   * Checks if a package is installed.
   * @param packageName The name of the package to check.
   * @returns True if the package is found, false otherwise.
   */
  private isInstalled(packageName: string): boolean {
    try {
      this.resolver(packageName);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifies that a package is installed and adds it to a list of missing
   * dependencies if it is not.
   * @param packageName The name of the package to check.
   */
  check(packageName: string): void {
    if (!this.isInstalled(packageName)) {
      this.missingDependencies.add(packageName);
    }
  }

  /**
   * Verifies that at least one of a list of packages is installed. If none are
   * installed, a custom error message is added to the list of errors.
   * @param packageNames An array of package names to check.
   * @param customErrorMessage The error message to use if none of the packages are found.
   */
  checkAny(packageNames: string[], customErrorMessage: string): void {
    if (packageNames.every((name) => !this.isInstalled(name))) {
      // This is a custom error, so we add it directly.
      // Using a Set avoids duplicate custom messages.
      this.missingDependencies.add(customErrorMessage);
    }
  }

  /**
   * Throws a `MissingDependenciesError` if any dependencies were found to be missing.
   * The error message is a formatted list of all missing packages.
   */
  report(): void {
    if (this.missingDependencies.size === 0) {
      return;
    }

    let message = 'The following packages are required but were not found:\n';
    for (const name of this.missingDependencies) {
      message += `  - ${name}\n`;
    }
    message += 'Please install the missing packages and rerun the test command.';

    throw new MissingDependenciesError(message);
  }
}
