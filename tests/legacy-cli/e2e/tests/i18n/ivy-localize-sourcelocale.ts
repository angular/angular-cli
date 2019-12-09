/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { externalServer, langTranslations, setupI18nConfig } from './legacy';

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig(true);

  // Update angular.json
  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = appProject.i18n;

    i18n.sourceLocale = 'fr';

    delete i18n.locales['fr'];
  });

  // Build each locale and verify the output.
  await ng('build');
  for (const { lang, outputPath } of langTranslations) {
    // does not exist in this test due to the source locale change
    if (lang === 'en-US') {
      continue;
    }

    await expectFileToMatch(`${outputPath}/vendor-es5.js`, lang);
    await expectFileToMatch(`${outputPath}/vendor-es2015.js`, lang);

    // Verify the locale data is registered using the global files
    await expectFileToMatch(`${outputPath}/vendor-es5.js`, '.ng.common.locales');
    await expectFileToMatch(`${outputPath}/vendor-es2015.js`, '.ng.common.locales');

    // Verify the HTML lang attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `lang="${lang}"`);
  }
}
