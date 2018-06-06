/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export function clean<T>(array: Array<T | undefined>): Array<T> {
  return array.filter(x => x !== undefined) as Array<T>;
}
