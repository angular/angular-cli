/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { WriteStream } from 'node:tty';
import { styleText } from 'node:util';

export const colors = Object.freeze({
  black: (text: string) => styleText('black', text),
  blue: (text: string) => styleText('blue', text),
  bold: (text: string) => styleText('bold', text),
  cyan: (text: string) => styleText('cyan', text),
  dim: (text: string) => styleText('dim', text),
  gray: (text: string) => styleText('gray', text),
  green: (text: string) => styleText('green', text),
  italic: (text: string) => styleText('italic', text),
  magenta: (text: string) => styleText('magenta', text),
  red: (text: string) => styleText('red', text),
  underline: (text: string) => styleText('underline', text),
  white: (text: string) => styleText('white', text),
  yellow: (text: string) => styleText('yellow', text),
});

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
