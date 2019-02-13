/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as caps from './caps';
import { colors } from './colors';

const stdout = typeof process == 'object'
  ? caps.getCapabilities(process.stdout) : { colors: false };

export const reset = stdout.colors ? colors.reset : (x: string) => x;
export const bold = stdout.colors ? colors.bold : (x: string) => x;
export const dim = stdout.colors ? colors.dim : (x: string) => x;
export const italic = stdout.colors ? colors.italic : (x: string) => x;
export const underline = stdout.colors ? colors.underline : (x: string) => x;
export const inverse = stdout.colors ? colors.inverse : (x: string) => x;
export const hidden = stdout.colors ? colors.hidden : (x: string) => x;
export const strikethrough = stdout.colors ? colors.strikethrough : (x: string) => x;

export const black = stdout.colors ? colors.black : (x: string) => x;
export const red = stdout.colors ? colors.red : (x: string) => x;
export const green = stdout.colors ? colors.green : (x: string) => x;
export const yellow = stdout.colors ? colors.yellow : (x: string) => x;
export const blue = stdout.colors ? colors.blue : (x: string) => x;
export const magenta = stdout.colors ? colors.magenta : (x: string) => x;
export const cyan = stdout.colors ? colors.cyan : (x: string) => x;
export const white = stdout.colors ? colors.white : (x: string) => x;
export const grey = stdout.colors ? colors.gray : (x: string) => x;
export const gray = stdout.colors ? colors.gray : (x: string) => x;

export const bgBlack = stdout.colors ? colors.bgBlack : (x: string) => x;
export const bgRed = stdout.colors ? colors.bgRed : (x: string) => x;
export const bgGreen = stdout.colors ? colors.bgGreen : (x: string) => x;
export const bgYellow = stdout.colors ? colors.bgYellow : (x: string) => x;
export const bgBlue = stdout.colors ? colors.bgBlue : (x: string) => x;
export const bgMagenta = stdout.colors ? colors.bgMagenta : (x: string) => x;
export const bgCyan = stdout.colors ? colors.bgCyan : (x: string) => x;
export const bgWhite = stdout.colors ? colors.bgWhite : (x: string) => x;
