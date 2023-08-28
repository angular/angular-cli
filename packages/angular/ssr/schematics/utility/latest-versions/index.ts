/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const latestVersions: Record<string, string> = {
  // We could have used TypeScripts' `resolveJsonModule` to make the `latestVersion` object typesafe,
  // but ts_library doesn't support JSON inputs.
  ...require('./package.json')['dependencies'],
};
