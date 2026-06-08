/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Internal benchmark reporting flag.
// Use with CLI --no-progress flag for best results.
// This should be false for commited code.
const _benchmark = false;
/* eslint-disable no-console */
export function time(label: string): void {
  if (_benchmark) {
    console.time(label);
  }
}

export function timeEnd(label: string): void {
  if (_benchmark) {
    console.timeEnd(label);
  }
}
