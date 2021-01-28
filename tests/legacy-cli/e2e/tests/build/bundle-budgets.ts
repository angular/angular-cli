/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  // Error
  await updateJsonFile('angular.json', json => {
    json.projects['test-project'].architect.build.options.budgets = [
      { type: 'all', maximumError: '100b' },
    ];
  });

  const errorMessage = await expectToFail(() => ng('build'));
  if (!/Error.+budget/.test(errorMessage)) {
    throw new Error('Budget error: all, max error.');
  }

  // Warning
  await updateJsonFile('angular.json', json => {
    json.projects['test-project'].architect.build.options.budgets = [
      { type: 'all', minimumWarning: '100mb' },
    ];
  });

  const { stderr } = await ng('build');
  if (!/Warning.+budget/.test(stderr)) {
    throw new Error('Budget warning: all, min warning');
  }

  // Pass
  await updateJsonFile('angular.json', json => {
    json.projects['test-project'].architect.build.options.budgets = [
      { type: 'allScript', maximumError: '100mb' },
    ];
  });

  const { stderr: stderr2 } = await ng('build');
  if (/(Warning|Error)/.test(stderr2)) {
    throw new Error('BIG max for all, should not error');
  }
}
