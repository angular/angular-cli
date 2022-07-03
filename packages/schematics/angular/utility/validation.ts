/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicsException } from '@angular-devkit/schematics';

// Must start with a letter, and must contain only alphanumeric characters or dashes.
// When adding a dash the segment after the dash must also start with a letter.
export const htmlSelectorRe = /^[a-zA-Z][.0-9a-zA-Z]*(:?-[a-zA-Z][.0-9a-zA-Z]*)*$/;

// See: https://github.com/tc39/proposal-regexp-unicode-property-escapes/blob/fe6d07fad74cd0192d154966baa1e95e7cda78a1/README.md#other-examples
const ecmaIdentifierNameRegExp = /^(?:[$_\p{ID_Start}])(?:[$_\u200C\u200D\p{ID_Continue}])*$/u;

export function validateHtmlSelector(selector: string): void {
  if (selector && !htmlSelectorRe.test(selector)) {
    throw new SchematicsException(`Selector "${selector}" is invalid.`);
  }
}

export function validateClassName(className: string): void {
  if (!ecmaIdentifierNameRegExp.test(className)) {
    throw new SchematicsException(`Class name "${className}" is invalid.`);
  }
}
