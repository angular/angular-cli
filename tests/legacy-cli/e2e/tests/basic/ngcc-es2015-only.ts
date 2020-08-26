/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';

export default async function() {
  if (getGlobalVariable('argv')['ve']) {
    // Don't run this test for VE jobs. It only applies to Ivy.
    return;
  }
  const { stderr, stdout } = await ng('build', '--prod');

  if (stdout.includes('as esm5') || stderr.includes('as esm5')) {
    throw new Error('ngcc should not process ES5 during differential loading builds.');
  }
}
