/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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

// Optimization and mangling
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

// Build cache
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

// Build profiling
const profilingVariable = process.env['NG_BUILD_PROFILING'];
export const profilingEnabled = isPresent(profilingVariable) && isEnabled(profilingVariable);

/**
 * Some environments, like CircleCI which use Docker report a number of CPUs by the host and not the count of available.
 * This cause `Error: Call retries were exceeded` errors when trying to use them.
 *
 * @see https://github.com/nodejs/node/issues/28762
 * @see https://github.com/webpack-contrib/terser-webpack-plugin/issues/143
 * @see https://ithub.com/angular/angular-cli/issues/16860#issuecomment-588828079
 *
 */
const maxWorkersVariable = process.env['NG_BUILD_MAX_WORKERS'];
export const maxWorkers = isPresent(maxWorkersVariable) ? +maxWorkersVariable : 4;
