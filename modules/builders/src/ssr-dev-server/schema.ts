/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
  /** Browser target to build. */
  browserTarget: string;

  /** Server target to build. */
  serverTarget: string;

  /**
   * Port to start the sync server at.
   * Default is 4200. Pass 0 to get a dynamically assigned port.
   */
  port: number;

  /** Log progress to the console while building. */
  progress: boolean;

  /** Opens the url in default browser. */
  open: boolean;
}
