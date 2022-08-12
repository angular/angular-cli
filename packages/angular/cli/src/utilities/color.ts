/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ansiColors from 'ansi-colors';
import { WriteStream } from 'tty';

function supportColor(): boolean {
  if (process.env.FORCE_COLOR !== undefined) {
    // 2 colors: FORCE_COLOR = 0 (Disables colors), depth 1
    // 16 colors: FORCE_COLOR = 1, depth 4
    // 256 colors: FORCE_COLOR = 2, depth 8
    // 16,777,216 colors: FORCE_COLOR = 3, depth 16
    // See: https://nodejs.org/dist/latest-v12.x/docs/api/tty.html#tty_writestream_getcolordepth_env
    // and https://github.com/nodejs/node/blob/b9f36062d7b5c5039498e98d2f2c180dca2a7065/lib/internal/tty.js#L106;
    switch (process.env.FORCE_COLOR) {
      case '':
      case 'true':
      case '1':
      case '2':
      case '3':
        return true;
      default:
        return false;
    }
  }

  if (process.stdout instanceof WriteStream) {
    return process.stdout.getColorDepth() > 1;
  }

  return false;
}

export function removeColor(text: string): string {
  // This has been created because when colors.enabled is false unstyle doesn't work
  // see: https://github.com/doowb/ansi-colors/blob/a4794363369d7b4d1872d248fc43a12761640d8e/index.js#L38
  return text.replace(ansiColors.ansiRegex, '');
}

// Create a separate instance to prevent unintended global changes to the color configuration
const colors = ansiColors.create();
colors.enabled = supportColor();

export { colors };
