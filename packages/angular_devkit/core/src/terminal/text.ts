/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as caps from './caps';
import * as ansi from './colors';


export const reset = caps.stdout.colors ? ansi.reset : (x: string) => x;
export const bold = caps.stdout.colors ? ansi.bold : (x: string) => x;
export const dim = caps.stdout.colors ? ansi.dim : (x: string) => x;
export const italic = caps.stdout.colors ? ansi.italic : (x: string) => x;
export const underline = caps.stdout.colors ? ansi.underline : (x: string) => x;
export const inverse = caps.stdout.colors ? ansi.inverse : (x: string) => x;
export const hidden = caps.stdout.colors ? ansi.hidden : (x: string) => x;
export const strikethrough = caps.stdout.colors ? ansi.strikethrough : (x: string) => x;

export const black = caps.stdout.colors ? ansi.black : (x: string) => x;
export const red = caps.stdout.colors ? ansi.red : (x: string) => x;
export const green = caps.stdout.colors ? ansi.green : (x: string) => x;
export const yellow = caps.stdout.colors ? ansi.yellow : (x: string) => x;
export const blue = caps.stdout.colors ? ansi.blue : (x: string) => x;
export const magenta = caps.stdout.colors ? ansi.magenta : (x: string) => x;
export const cyan = caps.stdout.colors ? ansi.cyan : (x: string) => x;
export const white = caps.stdout.colors ? ansi.white : (x: string) => x;
export const grey = caps.stdout.colors ? ansi.gray : (x: string) => x;
export const gray = caps.stdout.colors ? ansi.gray : (x: string) => x;

export const bgBlack = caps.stdout.colors ? ansi.bgBlack : (x: string) => x;
export const bgRed = caps.stdout.colors ? ansi.bgRed : (x: string) => x;
export const bgGreen = caps.stdout.colors ? ansi.bgGreen : (x: string) => x;
export const bgYellow = caps.stdout.colors ? ansi.bgYellow : (x: string) => x;
export const bgBlue = caps.stdout.colors ? ansi.bgBlue : (x: string) => x;
export const bgMagenta = caps.stdout.colors ? ansi.bgMagenta : (x: string) => x;
export const bgCyan = caps.stdout.colors ? ansi.bgCyan : (x: string) => x;
export const bgWhite = caps.stdout.colors ? ansi.bgWhite : (x: string) => x;
