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

// create a separate instance to prevent unintended global changes to the color configuration
// create function is not defined in the typings
const colors = (ansiColors as typeof ansiColors & { create: () => typeof ansiColors }).create();
colors.enabled = supportsColor;

export { colors };
