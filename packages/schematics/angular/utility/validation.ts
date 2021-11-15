/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';

// Must start with a letter, and must contain only alphanumeric characters or dashes.
// When adding a dash the segment after the dash must also start with a letter.
export const htmlSelectorRe = /^[a-zA-Z][.0-9a-zA-Z]*(:?-[a-zA-Z][.0-9a-zA-Z]*)*$/;

export function validateHtmlSelector(selector: string): void {
  if (selector && !htmlSelectorRe.test(selector)) {
    throw new SchematicsException(tags.oneLine`Selector (${selector})
        is invalid.`);
  }
}
