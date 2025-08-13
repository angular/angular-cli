/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { availableParallelism } from 'node:os';

/** A set of strings that are considered "truthy" when parsing environment variables. */
const TRUTHY_VALUES = new Set(['1', 'true']);

/** A set of strings that are considered "falsy" when parsing environment variables. */
const FALSY_VALUES = new Set(['0', 'false']);

/**
 * Checks if an environment variable is present and has a non-empty value.
 * @param variable The environment variable to check.
 * @returns `true` if the variable is a non-empty string.
 */
function isPresent(variable: string | undefined): variable is string {
  return typeof variable === 'string' && variable !== '';
}

/**
 * Parses an environment variable into a boolean or undefined.
 * @returns `true` if the variable is truthy ('1', 'true').
 * @returns `false` if the variable is falsy ('0', 'false').
 * @returns `undefined` if the variable is not present or has an unknown value.
 */
function parseTristate(variable: string | undefined): boolean | undefined {
  if (!isPresent(variable)) {
    return undefined;
  }

  const value = variable.toLowerCase();
  if (TRUTHY_VALUES.has(value)) {
    return true;
  }
  if (FALSY_VALUES.has(value)) {
    return false;
  }

  // TODO: Consider whether a warning is useful in this case of a malformed value
  return undefined;
}

// Optimization and mangling
const debugOptimizeVariable = process.env['NG_BUILD_DEBUG_OPTIMIZE'];
const debugOptimize = (() => {
  if (!isPresent(debugOptimizeVariable) || parseTristate(debugOptimizeVariable) === false) {
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

  if (parseTristate(debugOptimizeVariable) === true) {
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

/**
 * Allows disabling of code mangling when the `NG_BUILD_MANGLE` environment variable is set to `0` or `false`.
 * This is useful for debugging build output.
 */
export const allowMangle = parseTristate(process.env['NG_BUILD_MANGLE']) ?? debugOptimize.mangle;

/**
 * Allows beautification of build output when the `NG_BUILD_DEBUG_OPTIMIZE` environment variable is enabled.
 * This is useful for debugging build output.
 */
export const shouldBeautify = debugOptimize.beautify;

/**
 * Allows disabling of code minification when the `NG_BUILD_DEBUG_OPTIMIZE` environment variable is enabled.
 * This is useful for debugging build output.
 */
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

/**
 * The maximum number of workers to use for parallel processing.
 * This can be controlled by the `NG_BUILD_MAX_WORKERS` environment variable.
 */
export const maxWorkers = isPresent(maxWorkersVariable)
  ? +maxWorkersVariable
  : Math.min(4, Math.max(availableParallelism() - 1, 1));

/**
 * When `NG_BUILD_PARALLEL_TS` is set to `0` or `false`, parallel TypeScript compilation is disabled.
 */
export const useParallelTs = parseTristate(process.env['NG_BUILD_PARALLEL_TS']) !== false;

/**
 * When `NG_BUILD_DEBUG_PERF` is enabled, performance debugging information is printed.
 */
export const debugPerformance = parseTristate(process.env['NG_BUILD_DEBUG_PERF']) === true;

/**
 * When `NG_BUILD_WATCH_ROOT` is enabled, the build will watch the root directory for changes.
 */
export const shouldWatchRoot = parseTristate(process.env['NG_BUILD_WATCH_ROOT']) === true;

/**
 * When `NG_BUILD_TYPE_CHECK` is set to `0` or `false`, type checking is disabled.
 */
export const useTypeChecking = parseTristate(process.env['NG_BUILD_TYPE_CHECK']) !== false;

/**
 * When `NG_BUILD_LOGS_JSON` is enabled, build logs will be output in JSON format.
 */
export const useJSONBuildLogs = parseTristate(process.env['NG_BUILD_LOGS_JSON']) === true;

/**
 * When `NG_BUILD_OPTIMIZE_CHUNKS` is enabled, the build will optimize chunks.
 */
export const shouldOptimizeChunks = parseTristate(process.env['NG_BUILD_OPTIMIZE_CHUNKS']) === true;

/**
 * When `NG_HMR_CSTYLES` is enabled, component styles will be hot-reloaded.
 */
export const useComponentStyleHmr = parseTristate(process.env['NG_HMR_CSTYLES']) === true;

/**
 * When `NG_HMR_TEMPLATES` is set to `0` or `false`, component templates will not be hot-reloaded.
 */
export const useComponentTemplateHmr = parseTristate(process.env['NG_HMR_TEMPLATES']) !== false;

/**
 * When `NG_BUILD_PARTIAL_SSR` is enabled, a partial server-side rendering build will be performed.
 */
export const usePartialSsrBuild = parseTristate(process.env['NG_BUILD_PARTIAL_SSR']) === true;
