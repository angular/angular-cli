/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import assert from 'assert';

export function assertIsError(value: unknown): asserts value is Error & { code?: string } {
  assert(value instanceof Error, 'catch clause variable is not an Error instance');
}
