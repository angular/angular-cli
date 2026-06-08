/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * This file defines the interfaces for representing a project's installed
 * package dependency tree.
 */

/**
 * Represents a package that is installed in the project's node_modules.
 */
export interface InstalledPackage {
  /** The name of the package. */
  readonly name: string;

  /** The installed version of the package. */
  readonly version: string;

  /** The absolute path to the package's directory on disk, if available. */
  readonly path?: string;
}
