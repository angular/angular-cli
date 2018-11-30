/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as caps from './caps';
import { colors } from './colors';

export const reset = caps.stdout.colors ? colors.reset : (x: string) => x;
export const bold = caps.stdout.colors ? colors.bold : (x: string) => x;
export const dim = caps.stdout.colors ? colors.dim : (x: string) => x;
export const italic = caps.stdout.colors ? colors.italic : (x: string) => x;
export const underline = caps.stdout.colors ? colors.underline : (x: string) => x;
export const inverse = caps.stdout.colors ? colors.inverse : (x: string) => x;
export const hidden = caps.stdout.colors ? colors.hidden : (x: string) => x;
export const strikethrough = caps.stdout.colors ? colors.strikethrough : (x: string) => x;

export const black = caps.stdout.colors ? colors.black : (x: string) => x;
export const red = caps.stdout.colors ? colors.red : (x: string) => x;
export const green = caps.stdout.colors ? colors.green : (x: string) => x;
export const yellow = caps.stdout.colors ? colors.yellow : (x: string) => x;
export const blue = caps.stdout.colors ? colors.blue : (x: string) => x;
export const magenta = caps.stdout.colors ? colors.magenta : (x: string) => x;
export const cyan = caps.stdout.colors ? colors.cyan : (x: string) => x;
export const white = caps.stdout.colors ? colors.white : (x: string) => x;
export const grey = caps.stdout.colors ? colors.gray : (x: string) => x;
export const gray = caps.stdout.colors ? colors.gray : (x: string) => x;

export const bgBlack = caps.stdout.colors ? colors.bgBlack : (x: string) => x;
export const bgRed = caps.stdout.colors ? colors.bgRed : (x: string) => x;
export const bgGreen = caps.stdout.colors ? colors.bgGreen : (x: string) => x;
export const bgYellow = caps.stdout.colors ? colors.bgYellow : (x: string) => x;
export const bgBlue = caps.stdout.colors ? colors.bgBlue : (x: string) => x;
export const bgMagenta = caps.stdout.colors ? colors.bgMagenta : (x: string) => x;
export const bgCyan = caps.stdout.colors ? colors.bgCyan : (x: string) => x;
export const bgWhite = caps.stdout.colors ? colors.bgWhite : (x: string) => x;
