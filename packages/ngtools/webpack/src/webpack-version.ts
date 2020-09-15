/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';

let cachedIsWebpackFiveOrHigher: boolean | undefined;
export function isWebpackFiveOrHigher(): boolean {
  if (cachedIsWebpackFiveOrHigher === undefined) {
    cachedIsWebpackFiveOrHigher = false;
    if (typeof webpack.version === 'string') {
      const versionParts = webpack.version.split('.');
      if (versionParts[0] && Number(versionParts[0]) >= 5) {
        cachedIsWebpackFiveOrHigher = true;
      }
    }
  }

  return cachedIsWebpackFiveOrHigher;
}
