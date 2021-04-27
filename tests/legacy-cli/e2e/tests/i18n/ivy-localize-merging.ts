/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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

    i18n.locales['fr'] = [
      i18n.locales['fr'],
      i18n.locales['fr'],
    ]
    appProject.architect['build'].options.localize = ['fr'];
  });

  const { stderr: err1 } = await ng('build');
  if (!err1.includes('Duplicate translations for message')) {
    throw new Error('duplicate translations warning not shown');
  }


}
