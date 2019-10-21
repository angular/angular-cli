/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';

const mangleVariable = process.env['NG_BUILD_MANGLE'];
export const manglingDisabled =
  !!mangleVariable && (mangleVariable === '0' || mangleVariable.toLowerCase() === 'false');

const cacheVariable = process.env['NG_BUILD_CACHE'];
export const cachingDisabled =
  !!cacheVariable && (cacheVariable === '0' || cacheVariable.toLowerCase() === 'false');
export const cachingBasePath = (() => {
  if (
    cachingDisabled ||
    !cacheVariable ||
    (cacheVariable === '1' || cacheVariable.toLowerCase() === 'true')
  ) {
    return null;
  }
  if (!path.isAbsolute(cacheVariable)) {
    throw new Error('NG_BUILD_CACHE path value must be absolute.');
  }

  return cacheVariable;
})();
