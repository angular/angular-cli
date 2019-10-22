import * as express from 'express';
import { resolve } from 'path';
import { getGlobalVariable } from '../../utils/env';
import {
  appendToFile,
  copyFile,
  expectFileToExist,
  expectFileToMatch,
  replaceInFile,
  writeFile,
} from '../../utils/fs';
import { ng, npm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { readNgVersion } from '../../utils/version';

export default async function() {
  if (getGlobalVariable('argv').ve) {
    return;
  }

  let localizeVersion = '@angular/localize@' + readNgVersion();
  if (getGlobalVariable('argv')['ng-snapshots']) {
    localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
  }
  await npm('install', `${localizeVersion}`);
  await npm('run', 'webdriver-update');

  await updateJsonFile('tsconfig.json', config => {
    config.compilerOptions.target = 'es2015';
    config.angularCompilerOptions.disableTypeScriptVersionCheck = true;
  });

  const baseDir = 'dist/test-project';

  // Set configurations for each locale.
  const langTranslations = [
    { lang: 'en-US', translation: 'Hello i18n!' },
    { lang: 'fr', translation: 'Bonjour i18n!' },
    { lang: 'de', translation: 'Hallo i18n!' },
  ];

  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    const appArchitect = appProject.architect || appProject.targets;
    const serveConfigs = appArchitect['serve'].configurations;
    const e2eConfigs = appArchitect['e2e'].configurations;

    // Make default builds prod.
    appArchitect['build'].options.optimization = true;
    appArchitect['build'].options.buildOptimizer = true;
    appArchitect['build'].options.aot = true;
    appArchitect['build'].options.fileReplacements = [
      {
        replace: 'src/environments/environment.ts',
        with: 'src/environments/environment.prod.ts',
      },
    ];

    // Enable localization for all locales
    appArchitect['build'].options.localize = true;

    // Add locale definitions to the project
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = (appProject.i18n = { locales: {} });
    for (const { lang } of langTranslations) {
      if (lang == 'en-US') {
        i18n.sourceLocale = lang;
      } else {
        i18n.locales[lang] = `src/locale/messages.${lang}.xlf`;
      }
      serveConfigs[lang] = { browserTarget: `test-project:build:${lang}` };
      e2eConfigs[lang] = {
        specs: [`./src/app.${lang}.e2e-spec.ts`],
        devServerTarget: `test-project:serve:${lang}`,
      };
    }
  });

  // Add a translatable element.
  await writeFile(
    'src/app/app.component.html',
    '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>',
  );

  // Extract the translation messages and copy them for each language.
  await ng('xi18n', '--output-path=src/locale');
  await expectFileToExist('src/locale/messages.xlf');
  await expectFileToMatch('src/locale/messages.xlf', `source-language="en-US"`);
  await expectFileToMatch('src/locale/messages.xlf', `An introduction header for this sample`);

  for (const { lang, translation } of langTranslations) {
    if (lang != 'en-US') {
      await copyFile('src/locale/messages.xlf', `src/locale/messages.${lang}.xlf`);
      await replaceInFile(
        `src/locale/messages.${lang}.xlf`,
        'source-language="en-US"',
        `source-language="en-US" target-language="${lang}"`,
      );
      await replaceInFile(
        `src/locale/messages.${lang}.xlf`,
        '<source>Hello i18n!</source>',
        `<source>Hello i18n!</source>\n<target>${translation}</target>`,
      );
    }
  }

  // Build each locale and verify the output.
  await ng('build', '--i18n-missing-translation', 'error');
  for (const { lang, translation } of langTranslations) {
    await expectFileToMatch(`${baseDir}/${lang}/main-es5.js`, translation);
    await expectFileToMatch(`${baseDir}/${lang}/main-es2015.js`, translation);
    await expectToFail(() => expectFileToMatch(`${baseDir}/${lang}/main-es5.js`, '$localize'));
    await expectToFail(() => expectFileToMatch(`${baseDir}/${lang}/main-es2015.js`, '$localize'));

    // Ivy i18n doesn't yet work with `ng serve` so we must use a separate server.
    const app = express();
    app.use(express.static(resolve(baseDir, lang)));
    const server = app.listen(4200, 'localhost');
    try {
      // Add E2E test for locale
      await writeFile(
        'e2e/src/app.e2e-spec.ts',
        `
        import { browser, logging, element, by } from 'protractor';
        describe('workspace-project App', () => {
          it('should display welcome message', () => {
            browser.get(browser.baseUrl);
            expect(element(by.css('h1')).getText()).toEqual('${translation}');
          });
          afterEach(async () => {
            // Assert that there are no errors emitted from the browser
            const logs = await browser.manage().logs().get(logging.Type.BROWSER);
            expect(logs).not.toContain(jasmine.objectContaining({
              level: logging.Level.SEVERE,
            } as logging.Entry));
          });
        });
      `,
      );

      // Execute without a devserver.
      await ng('e2e', '--devServerTarget=');
    } finally {
      server.close();
    }
  }

  // Verify missing translation behaviour.
  await appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');
  await ng('build', '--i18n-missing-translation', 'ignore');
  await expectFileToMatch(`${baseDir}/fr/main-es5.js`, /Other content/);
  await expectFileToMatch(`${baseDir}/fr/main-es2015.js`, /Other content/);
  await expectToFail(() => ng('build', '--i18n-missing-translation', 'error'));
}
