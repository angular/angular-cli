/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { externalServer, langTranslations, setupI18nConfig } from './setup';

const baseHrefs: { [l: string]: string } = {
  'en-US': '/en/',
  fr: '/fr-FR/',
  de: '',
};

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  // Update angular.json
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = appProject.i18n;

    i18n.sourceLocale = {
      baseHref: baseHrefs['en-US'],
    };

    i18n.locales['fr'] = {
      translation: i18n.locales['fr'],
      baseHref: baseHrefs['fr'],
    };

    i18n.locales['de'] = {
      translation: i18n.locales['de'],
      baseHref: baseHrefs['de'],
    };
  });

  // Test absolute base href.
  await ng('build', '--base-href', 'http://www.domain.com/', '--configuration=development');
  for (const { lang, outputPath } of langTranslations) {
    // Verify the HTML base HREF attribute is present
    await expectFileToMatch(
      `${outputPath}/index.html`,
      `href="http://www.domain.com${baseHrefs[lang] || '/'}"`,
    );
  }
}
