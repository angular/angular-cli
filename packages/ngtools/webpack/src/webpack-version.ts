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

export function mergeResolverMainFields(
  options: object,
  originalMainFields: string[],
  extraMainFields: string[],
): object {
  const cleverMerge = (webpack as {
    util?: { cleverMerge?: (first: object, second: object) => object };
  }).util?.cleverMerge;
  if (cleverMerge) {
    // Webpack 5
    // https://github.com/webpack/webpack/issues/11635#issuecomment-707016779
    return cleverMerge(options, { mainFields: [...extraMainFields, '...'] });
  } else {
    // Webpack 4
    return {
      ...options,
      mainFields: [...extraMainFields, ...originalMainFields],
    };
  }
}
