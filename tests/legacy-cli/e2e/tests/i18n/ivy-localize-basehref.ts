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

const baseHrefs = {
  'en-US': '/en/',
  fr: '/fr-FR/',
  de: '',
};

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig(true);

  // Update angular.json
  await updateJsonFile('angular.json', workspaceJson => {
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

  // Build each locale and verify the output.
  await ng('build');
  for (const { lang, outputPath } of langTranslations) {
    if (baseHrefs[lang] === undefined) {
      throw new Error('Invalid E2E test setup: unexpected locale ' + lang);
    }

    // Verify the HTML lang attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `lang="${lang}"`);

    // Verify the HTML base HREF attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `href="${baseHrefs[lang] || '/'}"`);

    // Execute Application E2E tests with dev server
    await ng('e2e', `--configuration=${lang}`, '--port=0');

    // Execute Application E2E tests for a production build without dev server
    const server = externalServer(outputPath, baseHrefs[lang] || '/');
    try {
      await ng(
        'e2e',
        `--configuration=${lang}`,
        '--devServerTarget=',
        `--baseUrl=http://localhost:4200${baseHrefs[lang] || '/'}`,
      );
    } finally {
      server.close();
    }
  }

  // Update angular.json
  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;

    appArchitect['build'].options.baseHref = '/test/';
  });

  // Build each locale and verify the output.
  await ng('build');
  for (const { lang, outputPath } of langTranslations) {
    // Verify the HTML base HREF attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `href="/test${baseHrefs[lang] || '/'}"`);

    // Execute Application E2E tests with dev server
    await ng('e2e', `--configuration=${lang}`, '--port=0');

    // Execute Application E2E tests for a production build without dev server
    const server = externalServer(outputPath, '/test' + (baseHrefs[lang] || '/'));
    try {
      await ng(
        'e2e',
        `--configuration=${lang}`,
        '--devServerTarget=',
        `--baseUrl=http://localhost:4200/test${baseHrefs[lang] || '/'}`,
      );
    } finally {
      server.close();
    }
  }

  // Test absolute base href.
  await ng('build', '--base-href', 'http://www.domain.com/');
  for (const { lang, outputPath } of langTranslations) {
    // Verify the HTML base HREF attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `href="http://www.domain.com${baseHrefs[lang] || '/'}"`);
  }
}
