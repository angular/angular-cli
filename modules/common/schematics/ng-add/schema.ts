/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
  clientProject: string;
  appId?: string;
  ssr?: boolean;
  prerender?: boolean;
  skipInstall?: boolean;
}
