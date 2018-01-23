/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface SchematicsUpdateSchema {
  /**
   * Whether to use loose semver operators or to fix the version. Default to false.
   */
  loose?: boolean;
  /**
   * The target version, or dist-tag.
   */
  version?: string;
}
