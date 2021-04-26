/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

declare module '@discoveryjs/json-ext' {
  export function stringifyStream(value: unknown): import('stream').Readable;
}
