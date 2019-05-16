/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

// tslint:disable:max-line-length
export default function () {
  const budgetConfigs = [
    {
      expectation: 'pass',
      message: 'BIG max for all, should not error',
      budget: { type: 'allScript', maximumError: '100mb' },
    },
    {
      expectation: 'error',
      message: 'Budget error: all, max error',
      budget: { type: 'all', maximumError: '100b' },
    },
    {
      expectation: 'warning',
      message: 'Budget warning: all, min warning',
      budget: { type: 'all', minimumWarning: '100mb' },
    },
  ];

  const promiseFactories = budgetConfigs.map(cfg => {
    if (cfg.expectation === 'error') {
      return () => {
        return updateJsonFile('angular.json', (json) => {
            json.projects['test-project'].architect.build.options.budgets = [cfg.budget];
          })
          .then(() => expectToFail(() => ng('build', '--optimization')))
          .then(errorMessage => {
            if (!/ERROR in budgets/.test(errorMessage)) {
              throw new Error(cfg.message);
            }
          });
      };
    } else if (cfg.expectation === 'warning') {
      return () => {
        return updateJsonFile('angular.json', (json) => {
            json.projects['test-project'].architect.build.options.budgets = [cfg.budget];
          })
          .then(() => ng('build', '--optimization'))
          .then(({ stderr }) => {
            if (!/WARNING in budgets/.test(stderr)) {
              throw new Error(cfg.message);
            }
          });
      };
    } else { // pass
      return () => {
        return updateJsonFile('angular.json', (json) => {
            json.projects['test-project'].architect.build.options.budgets = [cfg.budget];
          })
          .then(() => ng('build', '--optimization'))
          .then(({ stderr }) => {
            if (/(WARNING|ERROR)/.test(stderr)) {
              throw new Error(cfg.message);
            }
          });
      };
    }
  });

  let promiseChain = Promise.resolve();
  for (let i = 0; i < promiseFactories.length; i++) {
    promiseChain = promiseChain.then(promiseFactories[i]);
  }

  return promiseChain;
}
