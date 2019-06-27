/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Internal benchmark reporting flag.
// Use with CLI --no-progress flag for best results.
// This should be false for commited code.
const _benchmark = false;
// tslint:disable:no-console
export function time(label: string) {
  if (_benchmark) {
    console.time(label);
  }
}

export function timeEnd(label: string) {
  if (_benchmark) {
    console.timeEnd(label);
  }
}
