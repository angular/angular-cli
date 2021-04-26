/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ansiColors from 'ansi-colors';
import { WriteStream } from 'tty';

type AnsiColors = typeof ansiColors;
const supportsColor = process.stdout instanceof WriteStream && process.stdout.getColorDepth() > 1;

export function removeColor(text: string): string {
  // This has been created because when colors.enabled is false unstyle doesn't work
  // see: https://github.com/doowb/ansi-colors/blob/a4794363369d7b4d1872d248fc43a12761640d8e/index.js#L38
  return text.replace(ansiColors.ansiRegex, '');
}

// Create a separate instance to prevent unintended global changes to the color configuration
// Create function is not defined in the typings. See: https://github.com/doowb/ansi-colors/pull/44
const colors = (ansiColors as AnsiColors & { create: () => AnsiColors }).create();
colors.enabled = supportsColor;

export { colors };
