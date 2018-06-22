/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
  /**
   * The name of the library. Required field.
   */
  name: string;
  /**
   * The path to create the interface.
   */
  entryFile?: string;
  /**
   * The prefix to apply to generated selectors.
   */
  prefix?: string;
  /**
   * Do not add dependencies to package.json (e.g., --skipPackageJson)
   */
  skipPackageJson?: boolean;
  /**
   * Skip installing dependency packages.
   */
  skipInstall?: boolean;
  /**
   * Do not update tsconfig.json for development experience (e.g., --skipTsConfig)
   */
  skipTsConfig?: boolean;
}
