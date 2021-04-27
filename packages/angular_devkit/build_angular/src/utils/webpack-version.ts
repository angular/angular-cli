/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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

// tslint:disable-next-line: no-any
export function withWebpackFourOrFive<T, R>(webpackFourValue: T, webpackFiveValue: R): any {
  return isWebpackFiveOrHigher() ? webpackFiveValue : webpackFourValue;
}
