/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as colors from 'ansi-colors';
import { WriteStream } from 'tty';

// Typings do not contain the function call (added in Node.js v9.9.0)
export const supportsColor =
  process.stdout instanceof WriteStream &&
  ((process.stdout as unknown) as { getColorDepth(): number }).getColorDepth() > 1;

(colors as { enabled: boolean }).enabled = supportsColor;

export { colors };
