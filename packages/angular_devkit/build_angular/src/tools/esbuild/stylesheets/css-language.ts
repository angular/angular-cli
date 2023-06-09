/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { StylesheetLanguage } from './stylesheet-plugin-factory';

export const CssStylesheetLanguage = Object.freeze<StylesheetLanguage>({
  name: 'css',
  componentFilter: /^css;/,
  fileFilter: /\.css$/,
});
