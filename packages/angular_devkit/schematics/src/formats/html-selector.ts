/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { schema } from '@angular-devkit/core';

// As per https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
// * Without mandatory `-` as the application prefix will generally cover its inclusion
// * And an allowance for upper alpha characters

// NOTE: This should eventually be broken out into two formats: full and partial (allows for prefix)

const unicodeRanges = [
  [0xc0, 0xd6],
  [0xd8, 0xf6],
  [0xf8, 0x37d],
  [0x37f, 0x1fff],
  [0x200c, 0x200d],
  [0x203f, 0x2040],
  [0x2070, 0x218f],
  [0x2c00, 0x2fef],
  [0x3001, 0xd7ff],
  [0xf900, 0xfdcf],
  [0xfdf0, 0xfffd],
  [0x10000, 0xeffff],
];

function isValidElementName(name: string) {
  let regex = '^[a-zA-Z][';

  regex += '-.0-9_a-zA-Z\\u{B7}';

  for (const range of unicodeRanges) {
    regex += `\\u{${range[0].toString(16)}}-\\u{${range[1].toString(16)}}`;
  }

  regex += ']*$';

  return new RegExp(regex, 'u').test(name);
}

export const htmlSelectorFormat: schema.SchemaFormat = {
  name: 'html-selector',
  formatter: {
    async: false,
    validate: (name: unknown) => typeof name === 'string' && isValidElementName(name),
  },
};
