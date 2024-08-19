/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { nodeless } from 'unenv';

const { path, fs } = nodeless.alias;

export default {
  format: 'esm',
  platform: 'browser',
  entryNames: 'index',
  legalComments: 'eof',
  alias: {
    fs,
    path,
  },

};
