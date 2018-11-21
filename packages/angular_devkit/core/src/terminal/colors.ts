/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { mapObject } from '../utils/object';

const kColors = {
  modifiers: {
    reset: [0, 0],
    bold: [1, 22], // 21 isn't widely supported and 22 does the same thing
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29],
  },
  colors: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    gray: [90, 39],
  },
  bgColors: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
  },
};
const kColorFunctions = mapObject(kColors, (_, v) => {
  return mapObject(v, (_, vv) => (x: string) => `\u001b[${vv[0]}m${x}\u001b[${vv[1]}m`);
});

export namespace colors {
  export const reset = kColorFunctions.modifiers.reset;
  export const bold = kColorFunctions.modifiers.bold;
  export const dim = kColorFunctions.modifiers.dim;
  export const italic = kColorFunctions.modifiers.italic;
  export const underline = kColorFunctions.modifiers.underline;
  export const inverse = kColorFunctions.modifiers.inverse;
  export const hidden = kColorFunctions.modifiers.hidden;
  export const strikethrough = kColorFunctions.modifiers.strikethrough;

  export const black = kColorFunctions.colors.black;
  export const red = kColorFunctions.colors.red;
  export const green = kColorFunctions.colors.green;
  export const yellow = kColorFunctions.colors.yellow;
  export const blue = kColorFunctions.colors.blue;
  export const magenta = kColorFunctions.colors.magenta;
  export const cyan = kColorFunctions.colors.cyan;
  export const white = kColorFunctions.colors.white;
  export const grey = kColorFunctions.colors.gray;
  export const gray = kColorFunctions.colors.gray;

  export const bgBlack = kColorFunctions.bgColors.bgBlack;
  export const bgRed = kColorFunctions.bgColors.bgRed;
  export const bgGreen = kColorFunctions.bgColors.bgGreen;
  export const bgYellow = kColorFunctions.bgColors.bgYellow;
  export const bgBlue = kColorFunctions.bgColors.bgBlue;
  export const bgMagenta = kColorFunctions.bgColors.bgMagenta;
  export const bgCyan = kColorFunctions.bgColors.bgCyan;
  export const bgWhite = kColorFunctions.bgColors.bgWhite;
}
