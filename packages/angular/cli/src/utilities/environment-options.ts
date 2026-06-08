/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

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

  return undefined;
}

/** Disables all analytics reporting when the `NG_CLI_ANALYTICS` environment variable is set to '0' or 'false'. */
export const analyticsDisabled = parseTristate(process.env['NG_CLI_ANALYTICS']) === false;

/** Identifies when the CLI is running in a Continuous Integration environment. */
export const isCI = parseTristate(process.env['CI']) === true;

/** Disables the automatic version check when the `NG_DISABLE_VERSION_CHECK` environment variable is enabled. */
export const disableVersionCheck = parseTristate(process.env['NG_DISABLE_VERSION_CHECK']) === true;

/** Enables debugging messages when the `NG_DEBUG` environment variable is enabled. */
export const ngDebug = parseTristate(process.env['NG_DEBUG']) === true;

/**
 * Forces the autocomplete script to be generated.
 * The `NG_FORCE_AUTOCOMPLETE` environment variable can be 'true', 'false', or undefined (for default behavior).
 */
export const forceAutocomplete = parseTristate(process.env['NG_FORCE_AUTOCOMPLETE']);

/**
 * When enabled, forces TTY mode.
 * The `NG_FORCE_TTY` environment variable can be 'true', 'false', or undefined (for default behavior).
 */
export const forceTty = parseTristate(process.env['NG_FORCE_TTY']);
