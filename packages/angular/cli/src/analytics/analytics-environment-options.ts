/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

function isDisabled(variable: string): boolean {
  return variable === '0' || variable.toLowerCase() === 'false';
}

function isPresent(variable: string | undefined): variable is string {
  return typeof variable === 'string' && variable !== '';
}

const analyticsVariable = process.env['NG_CLI_ANALYTICS'];
export const analyticsDisabled = isPresent(analyticsVariable) && isDisabled(analyticsVariable);

const analyticsShareVariable = process.env['NG_CLI_ANALYTICS_SHARE'];
export const analyticsShareDisabled =
  isPresent(analyticsShareVariable) && isDisabled(analyticsShareVariable);
