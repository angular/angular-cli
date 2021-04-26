/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ng } from '../../utils/process';

export default async function() {
  const { stderr, stdout } = await ng('build');

  if (stdout.includes('as esm5') || stderr.includes('as esm5')) {
    throw new Error('ngcc should not process ES5 during differential loading builds.');
  }
}
