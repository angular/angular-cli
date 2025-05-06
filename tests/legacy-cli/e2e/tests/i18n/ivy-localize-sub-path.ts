/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { baseDir, baseHrefs, externalServer, langTranslations, setupI18nConfig } from './setup';

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  const URL_SUB_PATH: Record<string, string> = {
    'en-US': '',
    'fr': 'fr',
    'de': 'deutsche',
  };

  // Update angular.json
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    const i18n: Record<string, any> = appProject.i18n;

    i18n.sourceLocale = {
      subPath: URL_SUB_PATH['en-US'],
    };

    i18n.locales['fr'] = {
      translation: i18n.locales['fr'],
      subPath: URL_SUB_PATH['fr'],
    };

    i18n.locales['de'] = {
      translation: i18n.locales['de'],
      subPath: URL_SUB_PATH['de'],
    };
  });

  // Build each locale and verify the output.
  await ng('build');
  for (const { lang } of langTranslations) {
    const subPath = URL_SUB_PATH[lang];
    const baseHref = subPath ? `/${subPath}/` : '/';
    const outputPath = join(baseDir, subPath);

    // Verify the HTML lang attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `lang="${lang}"`);

    // Verify the HTML base HREF attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `href="${baseHref}"`);

    // Execute Application E2E tests for a production build without dev server
    const { server, port, url } = await externalServer(outputPath, baseHref);

    try {
      await ng(
        'e2e',
        `--port=${port}`,
        `--configuration=${lang}`,
        '--dev-server-target=',
        `--base-url=${url}`,
      );
    } finally {
      server.close();
    }
  }
}
