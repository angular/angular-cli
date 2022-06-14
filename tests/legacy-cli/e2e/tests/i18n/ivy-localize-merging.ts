/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { setupI18nConfig } from './setup';

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  // Update angular.json
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    const i18n: Record<string, any> = appProject.i18n;

    i18n.locales['fr'] = [i18n.locales['fr'], i18n.locales['fr']];
    appProject.architect['build'].options.localize = ['fr'];
  });

  const { stderr: err1 } = await ng('build');
  if (!err1.includes('Duplicate translations for message')) {
    throw new Error('duplicate translations warning not shown');
  }

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    appProject.architect['build'].options.i18nDuplicateTranslation = 'error';
  });
  await expectToFail(() => ng('build'));

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    appProject.architect['build'].options.i18nDuplicateTranslation = 'ignore';
  });
  const { stderr: err2 } = await ng('build');
  if (err2.includes('Duplicate translations for message')) {
    throw new Error('duplicate translations message not ignore');
  }
}
