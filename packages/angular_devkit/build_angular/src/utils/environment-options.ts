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

const debugOptimizeVariable = process.env['NG_BUILD_DEBUG_OPTIMIZE'];
const debugOptimize = (() => {
  if (!isPresent(debugOptimizeVariable) || isDisabled(debugOptimizeVariable)) {
    return {
      mangle: true,
      minify: true,
      beautify: false,
    };
  }

  const debugValue = {
    mangle: false,
    minify: false,
    beautify: true,
  };

  if (isEnabled(debugOptimizeVariable)) {
    return debugValue;
  }

  for (const part of debugOptimizeVariable.split(',')) {
    switch (part.trim().toLowerCase()) {
      case 'mangle':
        debugValue.mangle = true;
        break;
      case 'minify':
        debugValue.minify = true;
        break;
      case 'beautify':
        debugValue.beautify = true;
        break;
    }
  }

  return debugValue;
})();

const mangleVariable = process.env['NG_BUILD_MANGLE'];
export const allowMangle = isPresent(mangleVariable)
  ? !isDisabled(mangleVariable)
  : debugOptimize.mangle;

export const shouldBeautify = debugOptimize.beautify;
export const allowMinify = debugOptimize.minify;

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
