/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

function isEnabled(variable: string): boolean {
  return variable === '1' || variable.toLowerCase() === 'true';
}

function isPresent(variable: string | undefined): variable is string {
  return typeof variable === 'string' && variable !== '';
}

// Use UpdateBuffer2, which uses magic-string internally.
// TODO: Switch this for the next major release to use UpdateBuffer2 by default.
const updateBufferV2 = process.env['NG_UPDATE_BUFFER_V2'];
export const updateBufferV2Enabled = isPresent(updateBufferV2) && isEnabled(updateBufferV2);
