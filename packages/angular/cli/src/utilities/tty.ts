/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { forceTty, isCI } from './environment-options';

/**
 * Determines if the `stream` is a TTY.
 *
 * @param stream A NodeJS stream to check. Defaults to `process.stdout`.
 * @returns `true` if the `stream` is a TTY, `false` otherwise. This detection is overridden
 * by the `NG_FORCE_TTY` environment variable. In a CI environment, this will also be `false`
 * unless `NG_FORCE_TTY` is set.
 */
export function isTTY(stream: NodeJS.WriteStream = process.stdout): boolean {
  return forceTty ?? (!!stream.isTTY && !isCI);
}
