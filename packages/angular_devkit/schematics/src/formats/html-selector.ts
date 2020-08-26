/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
  [0xC0, 0xD6],
  [0xD8, 0xF6],
  [0xF8, 0x37D],
  [0x37F, 0x1FFF],
  [0x200C, 0x200D],
  [0x203F, 0x2040],
  [0x2070, 0x218F],
  [0x2C00, 0x2FEF],
  [0x3001, 0xD7FF],
  [0xF900, 0xFDCF],
  [0xFDF0, 0xFFFD],
  [0x10000, 0xEFFFF],
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
    validate: name => typeof name === 'string' && isValidElementName(name),
  },
};
