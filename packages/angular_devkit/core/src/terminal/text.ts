/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as caps from './caps';
import { colors } from './colors';

const supportColors: boolean = typeof process === 'object' ? caps.getCapabilities(process.stdout).colors : false;
const identityFn = (x: string) => x;

export const reset = supportColors ? colors.reset : identityFn;
export const bold = supportColors ? colors.bold : identityFn;
export const dim = supportColors ? colors.dim : identityFn;
export const italic = supportColors ? colors.italic : identityFn;
export const underline = supportColors ? colors.underline : identityFn;
export const inverse = supportColors ? colors.inverse : identityFn;
export const hidden = supportColors ? colors.hidden : identityFn;
export const strikethrough = supportColors ? colors.strikethrough : identityFn;

export const black = supportColors ? colors.black : identityFn;
export const red = supportColors ? colors.red : identityFn;
export const green = supportColors ? colors.green : identityFn;
export const yellow = supportColors ? colors.yellow : identityFn;
export const blue = supportColors ? colors.blue : identityFn;
export const magenta = supportColors ? colors.magenta : identityFn;
export const cyan = supportColors ? colors.cyan : identityFn;
export const white = supportColors ? colors.white : identityFn;
export const grey = supportColors ? colors.gray : identityFn;
export const gray = supportColors ? colors.gray : identityFn;

export const bgBlack = supportColors ? colors.bgBlack : identityFn;
export const bgRed = supportColors ? colors.bgRed : identityFn;
export const bgGreen = supportColors ? colors.bgGreen : identityFn;
export const bgYellow = supportColors ? colors.bgYellow : identityFn;
export const bgBlue = supportColors ? colors.bgBlue : identityFn;
export const bgMagenta = supportColors ? colors.bgMagenta : identityFn;
export const bgCyan = supportColors ? colors.bgCyan : identityFn;
export const bgWhite = supportColors ? colors.bgWhite : identityFn;
