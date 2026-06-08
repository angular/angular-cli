/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { WriteStream } from 'node:tty';

export { color as colors, figures } from 'listr2';

export function supportColor(stream: NodeJS.WritableStream = process.stdout): boolean {
  if (stream instanceof WriteStream) {
    return stream.hasColors();
  }

  try {
    // The hasColors function does not rely on any instance state and should ideally be static
    return WriteStream.prototype.hasColors();
  } catch {
    return process.env['FORCE_COLOR'] !== undefined && process.env['FORCE_COLOR'] !== '0';
  }
}
