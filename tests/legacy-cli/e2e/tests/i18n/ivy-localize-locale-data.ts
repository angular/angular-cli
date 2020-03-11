/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { setupI18nConfig } from './legacy';

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig(true);

  // Update angular.json
  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = appProject.i18n;

    i18n.sourceLocale = 'fr-Abcd';
    appProject.architect['build'].options.localize = ['fr-Abcd'];
  });

  const { stderr: err1 } = await ng('build');
  if (!err1.includes(`Locale data for 'fr-Abcd' cannot be found.  Using locale data for 'fr'.`)) {
    throw new Error('locale data fallback warning not shown');
  }

  // Update angular.json
  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = appProject.i18n;

    i18n.sourceLocale = 'en-US';
    appProject.architect['build'].options.localize = ['en-US'];
  });

  const { stderr: err2 } = await ng('build');
  if (err2.includes(`Locale data for 'en-US' cannot be found.  No locale data will be included for this locale.`)) {
    throw new Error('locale data not found warning shown');
  }

  // Update angular.json
  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = appProject.i18n;

    i18n.sourceLocale = 'en-x-abc';
    appProject.architect['build'].options.localize = ['en-x-abc'];
  });

  const { stderr: err3 } = await ng('build');
  if (err3.includes(`Locale data for 'en-x-abc' cannot be found.  No locale data will be included for this locale.`)) {
    throw new Error('locale data not found warning shown');
  }
}
