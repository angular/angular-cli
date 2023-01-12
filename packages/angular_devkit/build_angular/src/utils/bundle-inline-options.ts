/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface InlineOptions {
  filename: string;
  code: string;
  map?: string;
  outputPath: string;
  missingTranslation?: 'warning' | 'error' | 'ignore';
  setLocale?: boolean;
}
