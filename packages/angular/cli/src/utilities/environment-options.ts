/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

function isPresent(variable: string | undefined): variable is string {
  return typeof variable === 'string' && variable !== '';
}

function isDisabled(variable: string | undefined): boolean {
  return isPresent(variable) && (variable === '0' || variable.toLowerCase() === 'false');
}

function isEnabled(variable: string | undefined): boolean {
  return isPresent(variable) && (variable === '1' || variable.toLowerCase() === 'true');
}

function optional(variable: string | undefined): boolean | undefined {
  if (!isPresent(variable)) {
    return undefined;
  }

  return isEnabled(variable);
}

export const analyticsDisabled = isDisabled(process.env['NG_CLI_ANALYTICS']);
export const isCI = isEnabled(process.env['CI']);
export const disableVersionCheck = isEnabled(process.env['NG_DISABLE_VERSION_CHECK']);
export const ngDebug = isEnabled(process.env['NG_DEBUG']);
export const forceAutocomplete = optional(process.env['NG_FORCE_AUTOCOMPLETE']);
