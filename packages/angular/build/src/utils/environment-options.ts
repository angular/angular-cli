/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { availableParallelism } from 'node:os';

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
export const maxWorkers = isPresent(maxWorkersVariable)
  ? +maxWorkersVariable
  : Math.min(4, Math.max(availableParallelism() - 1, 1));

const parallelTsVariable = process.env['NG_BUILD_PARALLEL_TS'];
export const useParallelTs = !isPresent(parallelTsVariable) || !isDisabled(parallelTsVariable);

const debugPerfVariable = process.env['NG_BUILD_DEBUG_PERF'];
export const debugPerformance = isPresent(debugPerfVariable) && isEnabled(debugPerfVariable);

const watchRootVariable = process.env['NG_BUILD_WATCH_ROOT'];
export const shouldWatchRoot = isPresent(watchRootVariable) && isEnabled(watchRootVariable);

const typeCheckingVariable = process.env['NG_BUILD_TYPE_CHECK'];
export const useTypeChecking =
  !isPresent(typeCheckingVariable) || !isDisabled(typeCheckingVariable);

const buildLogsJsonVariable = process.env['NG_BUILD_LOGS_JSON'];
export const useJSONBuildLogs =
  isPresent(buildLogsJsonVariable) && isEnabled(buildLogsJsonVariable);

const optimizeChunksVariable = process.env['NG_BUILD_OPTIMIZE_CHUNKS'];
export const shouldOptimizeChunks =
  isPresent(optimizeChunksVariable) && isEnabled(optimizeChunksVariable);

const hmrComponentStylesVariable = process.env['NG_HMR_CSTYLES'];
export const useComponentStyleHmr =
  !isPresent(hmrComponentStylesVariable) || !isDisabled(hmrComponentStylesVariable);

const hmrComponentTemplateVariable = process.env['NG_HMR_TEMPLATES'];
export const useComponentTemplateHmr =
  isPresent(hmrComponentTemplateVariable) && isEnabled(hmrComponentTemplateVariable);

const partialSsrBuildVariable = process.env['NG_BUILD_PARTIAL_SSR'];
export const usePartialSsrBuild =
  isPresent(partialSsrBuildVariable) && isEnabled(partialSsrBuildVariable);
