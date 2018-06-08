/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface KarmaBuilderSchema {
  /**
   * The path to the Karma configuration file.
   */
  karmaConfig: string;
  /**
   * Run only once.
   */
  singleRun?: boolean;
}
