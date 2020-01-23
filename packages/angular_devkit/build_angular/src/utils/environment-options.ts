/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';

function isDisabled(variable: string): boolean {
  return variable === '0' || variable.toLowerCase() === 'false';
}

function isEnabled(variable: string): boolean {
  return variable === '1' || variable.toLowerCase() === 'true';
}

function isPresent(variable: string | undefined): variable is string {
  return typeof variable === 'string' && variable !== '';
}

const mangleVariable = process.env['NG_BUILD_MANGLE'];
export const manglingDisabled = isPresent(mangleVariable) && isDisabled(mangleVariable);

const beautifyVariable = process.env['NG_BUILD_BEAUTIFY'];
export const beautifyEnabled = isPresent(beautifyVariable) && !isDisabled(beautifyVariable);

const minifyVariable = process.env['NG_BUILD_MINIFY'];
export const minifyDisabled = isPresent(minifyVariable) && isDisabled(minifyVariable);

const cacheVariable = process.env['NG_BUILD_CACHE'];
export const cachingDisabled = isPresent(cacheVariable) && isDisabled(cacheVariable);
export const cachingBasePath = (() => {
  if (cachingDisabled || !isPresent(cacheVariable) || isEnabled(cacheVariable)) {
    return null;
  }
  if (!path.isAbsolute(cacheVariable)) {
    throw new Error('NG_BUILD_CACHE path value must be absolute.');
  }

  return cacheVariable;
})();
