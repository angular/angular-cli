/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ansiColors from 'ansi-colors';
import { WriteStream } from 'tty';

// Typings do not contain the function call (added in Node.js v9.9.0)
export const supportsColor =
  process.stdout instanceof WriteStream &&
  ((process.stdout as unknown) as { getColorDepth(): number }).getColorDepth() > 1;

export function removeColor(text: string): string {
  return text.replace(new RegExp(ansiColors.ansiRegex), '');
}

// tslint:disable-next-line: no-any
const colors = (ansiColors as any).create() as typeof ansiColors;
colors.enabled = supportsColor;

export { colors };
