import * as express from 'express';
import { resolve } from 'path';
import { getGlobalVariable } from '../../../utils/env';
import { appendToFile, copyFile, expectFileToExist, expectFileToMatch, replaceInFile, writeFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const baseDir = 'dist/test-project';
  const enDir = `${baseDir}/en`;
  const frDist = `${baseDir}/fr`;
  const deDir = `${baseDir}/de`;

  // Set configurations for each locale.
  const langTranslations = [
    {
      lang: 'en', outputPath: enDir,
      translation: { hello: 'Hello i18n!', plural: 'Updated 3 minutes ago' },
    },
    {
      lang: 'fr', outputPath: frDist,
      translation: { hello: 'Bonjour i18n!', plural: 'Mis à jour Il y a 3 minutes' },
      pluralTargets: {
        text: '<target>Mis à jour <x id="ICU" equiv-text="{minutes, plural, =0 {...} =1 {...} other {...}}"/></target>',
        interpolation: '<target>{VAR_PLURAL, plural, =0 {juste maintenant} =1 {il y a une minute} other {Il y a <x id="INTERPOLATION" equiv-text="{{minutes}}"/> minutes} }</target>',
      },
    },
    {
      lang: 'de', outputPath: deDir,
      translation: { hello: 'Hallo i18n!', plural: 'Aktualisiert vor 3 Minuten' },
      pluralTargets: {
        text: '<target>Aktualisiert <x id="ICU" equiv-text="{minutes, plural, =0 {...} =1 {...} other {...}}"/></target>',
        interpolation: '<target>{VAR_PLURAL, plural, =0 {gerade jetzt} =1 {vor einer Minute} other {vor <x id="INTERPOLATION" equiv-text="{{minutes}}"/> Minuten} }</target>',
      },
    },
  ];

  await replaceInFile('src/app/app.component.ts', `title = 'test-project';`, `title = 'test-project';minutes=3;`);

  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    const browserConfigs = appArchitect['build'].configurations;
    const serveConfigs = appArchitect['serve'].configurations;
    const e2eConfigs = appArchitect['e2e'].configurations;

    // Make default builds prod.
    appArchitect['build'].options.optimization = true;
    appArchitect['build'].options.buildOptimizer = true;
    appArchitect['build'].options.aot = true;
    appArchitect['build'].options.fileReplacements = [{
      replace: 'src/environments/environment.ts',
      with: 'src/environments/environment.prod.ts',
    }];

    for (const { lang, outputPath } of langTranslations) {
      if (lang == 'en') {
        browserConfigs[lang] = { outputPath };
      } else {
        browserConfigs[lang] = {
          outputPath,
          i18nFile: `src/locale/messages.${lang}.xlf`,
          i18nFormat: `xlf`,
          i18nLocale: lang,
        };
      }
      serveConfigs[lang] = { browserTarget: `test-project:build:${lang}` };
      e2eConfigs[lang] = {
        specs: [`./src/app.${lang}.e2e-spec.ts`],
        devServerTarget: `test-project:serve:${lang}`,
      };
    }
  });

  // Add e2e specs for each lang.
  for (const { lang, translation } of langTranslations) {
    await writeFile(`./src/app.${lang}.e2e-spec.ts`, `
      import { browser, logging, element, by } from 'protractor';

      describe('workspace-project App', () => {
        it('should display welcome message', () => {
          browser.get(browser.baseUrl);
          expect(element(by.css('h1')).getText()).toEqual('${translation.hello}');
        });

        it('should display pluralized message', () => {
          browser.get(browser.baseUrl);
          expect(element(by.css('h2')).getText()).toEqual('${translation.plural}');
        });

        afterEach(async () => {
          // Assert that there are no errors emitted from the browser
          const logs = await browser.manage().logs().get(logging.Type.BROWSER);
          expect(logs).not.toContain(jasmine.objectContaining({
            level: logging.Level.SEVERE,
          } as logging.Entry));
        });
      });
    `);
  }

  // Add translatable elements.
  await writeFile('src/app/app.component.html',
    '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>\n' +
    '<h2 i18n>Updated {minutes, plural, =0 {just now} =1 {one minute ago} other {{{minutes}} minutes ago}}</h2>');
  await replaceInFile('src/app/app.component.ts', `title = 'latest-app'`, 'minutes = 3');

  // Extract the translation messages and copy them for each language.
  await ng('xi18n', '--output-path=src/locale');
  await expectFileToExist('src/locale/messages.xlf');
  await expectFileToMatch('src/locale/messages.xlf', `source-language="en-US"`);
  await expectFileToMatch('src/locale/messages.xlf', `An introduction header for this sample`);

  const helloSrc = '<source>Hello i18n!</source>';
  const pluralTextSrc = '<source>Updated <x id="ICU" equiv-text="{minutes, plural, =0 {...} =1 {...} other {...}}"/></source>';
  const pluralInterpolationSrc = '<source>{VAR_PLURAL, plural, =0 {just now} =1 {one minute ago} other {<x id="INTERPOLATION" equiv-text="{{minutes}}"/> minutes ago} }</source>';
  for (const { lang, translation, pluralTargets } of langTranslations) {
    if (lang != 'en') {
      await copyFile('src/locale/messages.xlf', `src/locale/messages.${lang}.xlf`);
      await replaceInFile(`src/locale/messages.${lang}.xlf`, helloSrc,
        `${helloSrc}\n<target>${translation.hello}</target>`);
      await replaceInFile(`src/locale/messages.${lang}.xlf`, pluralTextSrc,
        `${pluralTextSrc}\n${pluralTargets.text}`);
      await replaceInFile(`src/locale/messages.${lang}.xlf`, pluralInterpolationSrc,
        `${pluralInterpolationSrc}\n${pluralTargets.interpolation}`);
    }
  }

  for (const { lang, translation, outputPath } of langTranslations) {
    // Build each locale and verify the output.
    await ng('build', `--configuration=${lang}`);
    await expectFileToMatch(`${outputPath}/main-es5.js`, translation.hello);
    await expectFileToMatch(`${outputPath}/main-es2015.js`, translation.hello);

    // E2E to verify the output runs and is correct.
    if (getGlobalVariable('argv')['ve']) {
      await ng('e2e', `--configuration=${lang}`);
    } else {
      // Ivy i18n doesn't yet work with `ng serve` so we must use a separate server.
      const app = express();
      app.use(express.static(resolve(outputPath)));
      const server = app.listen(4200, 'localhost');
      try {
        // Execute without a devserver.
        await ng('e2e', '--devServerTarget=');
      } finally {
        server.close();
      }
    }
  }

  // Verify missing translation behaviour.
  await appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');
  await ng('build', '--configuration=fr', '--i18n-missing-translation', 'ignore');
  await expectFileToMatch(`${frDist}/main-es5.js`, /Other content/);
  await expectFileToMatch(`${frDist}/main-es2015.js`, /Other content/);
  await expectToFail(() => ng('build', '--configuration=fr', '--i18n-missing-translation', 'error'));
}
