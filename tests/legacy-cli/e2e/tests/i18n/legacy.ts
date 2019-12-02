import * as express from 'express';
import { resolve } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, copyFile, expectFileToExist, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { ng, npm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { readNgVersion } from '../../utils/version';

// Configurations for each locale.
export const baseDir = 'dist/test-project';
export const langTranslations = [
  {
    lang: 'en-US', outputPath: `${baseDir}/en-US`,
    translation: {
      helloPartial: 'Hello',
      hello: 'Hello i18n!',
      plural: 'Updated 3 minutes ago',
      date: 'January',
    },
  },
  {
    lang: 'fr', outputPath: `${baseDir}/fr`,
    translation: {
      helloPartial: 'Bonjour',
      hello: 'Bonjour i18n!',
      plural: 'Mis à jour il y a 3 minutes',
      date: 'janvier',
    },
    translationReplacements: [
      ['Hello', 'Bonjour'],
      ['Updated', 'Mis à jour'],
      ['just now', 'juste maintenant'],
      ['one minute ago', 'il y a une minute'],
      [/other {/g, 'other {il y a '],
      ['minutes ago', 'minutes'],
    ],
  },
  {
    lang: 'de', outputPath: `${baseDir}/de`,
    translation: {
      helloPartial: 'Hallo',
      hello: 'Hallo i18n!',
      plural: 'Aktualisiert vor 3 Minuten',
      date: 'Januar',
    },
    translationReplacements: [
      ['Hello', 'Hallo'],
      ['Updated', 'Aktualisiert'],
      ['just now', 'gerade jetzt'],
      ['one minute ago', 'vor einer Minute'],
      [/other {/g, 'other {vor '],
      ['minutes ago', 'Minuten'],
    ],
  },
];
export const sourceLocale = langTranslations[0].lang;

export const externalServer = (outputPath: string, baseUrl = '/') => {
  const app = express();
  app.use(baseUrl, express.static(resolve(outputPath)));

  // call .close() on the return value to close the server.
  return app.listen(4200, 'localhost');
};

export const formats = {
  'xlf': {
    ext: 'xlf',
    sourceCheck: 'source-language="en-US"',
    replacements: [
      [/source/g, 'target'],
    ],
  },
  'xlf2': {
    ext: 'xlf',
    sourceCheck: 'srcLang="en-US"',
    replacements: [
      [/source/g, 'target'],
    ],
  },
  'xmb': {
    ext: 'xmb',
    sourceCheck: '<!DOCTYPE messagebundle',
    replacements: [
      [/messagebundle/g, 'translationbundle'],
      [/msg/g, 'translation'],
      [/<source>.*?<\/source>/g, ''],
    ],
  },
};

export async function setupI18nConfig(useLocalize = true, format: keyof typeof formats = 'xlf') {
  // Add component with i18n content, both translations and localeData (plural, dates).
  await writeFile('src/app/app.component.ts', `
    import { Component, Inject, LOCALE_ID } from '@angular/core';
    @Component({
      selector: 'app-root',
      templateUrl: './app.component.html'
    })
    export class AppComponent {
      constructor(@Inject(LOCALE_ID) public locale: string) { }
      title = 'i18n';
      jan = new Date(2000, 0, 1);
      minutes = 3;
    }
  `);
  await writeFile(`src/app/app.component.html`, `
    <p id="hello" i18n="An introduction header for this sample">Hello {{ title }}! </p>
    <p id="locale">{{ locale }}</p>
    <p id="date">{{ jan | date : 'LLLL' }}</p>
    <p id="plural" i18n>Updated {minutes, plural, =0 {just now} =1 {one minute ago} other {{{minutes}} minutes ago}}</p>
  `);

  // Add a dynamic import to ensure syntax is supported
  // ng serve support: https://github.com/angular/angular-cli/issues/16248
  await writeFile('src/app/dynamic.ts', `export const abc = 5;`);
  await appendToFile('src/app/app.component.ts', `
    (async () => { await import('./dynamic'); })();
  `);

  // Add e2e specs for each lang.
  for (const { lang, translation } of langTranslations) {
    await writeFile(`./e2e/src/app.${lang}.e2e-spec.ts`, `
      import { browser, logging, element, by } from 'protractor';

      describe('workspace-project App', () => {
        const getParagraph = (name: string) => element(by.css('app-root p#' + name)).getText();
        beforeEach(() => browser.get(browser.baseUrl));
        afterEach(async () => {
          // Assert that there are no errors emitted from the browser
          const logs = await browser.manage().logs().get(logging.Type.BROWSER);
          expect(logs).not.toContain(jasmine.objectContaining({
            level: logging.Level.SEVERE,
          } as logging.Entry));
        });

        it('should display welcome message', () =>
          expect(getParagraph('hello')).toEqual('${translation.hello}'));

        it('should display locale', () =>
          expect(getParagraph('locale')).toEqual('${lang}'));

        it('should display localized date', () =>
          expect(getParagraph('date')).toEqual('${translation.date}'));

        it('should display pluralized message', () =>
          expect(getParagraph('plural')).toEqual('${translation.plural}'));
      });
    `);
  }

  // Update angular.json to build, serve, and test each locale.
  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    const appArchitect = workspaceJson.projects['test-project'].architect;
    const buildConfigs = appArchitect['build'].configurations;
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

    // Always error on missing translations.
    appArchitect['build'].options.i18nMissingTranslation = 'error';

    if (useLocalize) {
      // Enable localization for all locales
      appArchitect['build'].options.localize = true;
    }

    // Add i18n config items (app, build, serve, e2e).
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = (appProject.i18n = { locales: {} });
    for (const { lang, outputPath } of langTranslations) {
      if (!useLocalize) {
        if (lang == sourceLocale) {
          buildConfigs[lang] = { outputPath, i18nLocale: lang };
        } else {
          buildConfigs[lang] = {
            outputPath,
            i18nFile: `src/locale/messages.${lang}.${formats[format].ext}`,
            i18nFormat: format,
            i18nLocale: lang,
          };
        }
      } else {
        if (lang == sourceLocale) {
          i18n.sourceLocale = lang;
        } else {
          i18n.locales[lang] = `src/locale/messages.${lang}.${formats[format].ext}`;
        }
        buildConfigs[lang] = { localize: [lang] };
      }

      serveConfigs[lang] = { browserTarget: `test-project:build:${lang}` };
      e2eConfigs[lang] = {
        specs: [`./src/app.${lang}.e2e-spec.ts`],
        devServerTarget: `test-project:serve:${lang}`,
      };
    }
  });

  // Extract the translation messages.
  await ng('xi18n', '--output-path=src/locale', `--format=${format}`);
  const translationFile = `src/locale/messages.${formats[format].ext}`;
  await expectFileToExist(translationFile);
  await expectFileToMatch(translationFile, formats[format].sourceCheck);
  await expectFileToMatch(translationFile, `An introduction header for this sample`);

  // Make translations for each language.
  for (const { lang, translationReplacements } of langTranslations) {
    if (lang != sourceLocale) {
      await copyFile(translationFile, `src/locale/messages.${lang}.${formats[format].ext}`);
      for (const replacements of translationReplacements) {
        await replaceInFile(
          `src/locale/messages.${lang}.${formats[format].ext}`,
          replacements[0],
          replacements[1] as string,
        );
      }
      for (const replacement of formats[format].replacements) {
        await replaceInFile(
          `src/locale/messages.${lang}.${formats[format].ext}`,
          replacement[0],
          replacement[1] as string,
        );
      }
    }
  }

  // Install the localize package if using ivy
  if (!getGlobalVariable('argv')['ve']) {
    let localizeVersion = '@angular/localize@' + readNgVersion();
    if (getGlobalVariable('argv')['ng-snapshots']) {
      localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
    }
    await npm('install', `${localizeVersion}`);
  }
}

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig(false);

  // Legacy option usage with the en-US locale needs $localize when using ivy
  // Legacy usage did not need to process en-US and typically no i18nLocale options were present
  // This will currently be the overwhelmingly common scenario for users updating existing projects
  if (!getGlobalVariable('argv')['ve']) {
    await appendToFile('src/polyfills.ts', `import '@angular/localize/init';`);
  }

  // Build each locale and verify the output.
  for (const { lang, translation, outputPath } of langTranslations) {
    await ng('build', `--configuration=${lang}`);
    await expectFileToMatch(`${outputPath}/main-es5.js`, translation.helloPartial);
    await expectFileToMatch(`${outputPath}/main-es2015.js`, translation.helloPartial);

    // Verify the HTML lang attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `lang="${lang}"`);

    // Execute Application E2E tests with dev server
    await ng('e2e', `--configuration=${lang}`, '--port=0');

    // Execute Application E2E tests for a production build without dev server
    const server = externalServer(outputPath);
    try {
      await ng('e2e', `--configuration=${lang}`, '--devServerTarget=');
    } finally {
      server.close();
    }
  }

  // Verify missing translation behaviour.
  await appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');
  await ng('build', '--configuration=fr', '--i18n-missing-translation', 'ignore');
  await expectFileToMatch(`${baseDir}/fr/main-es5.js`, /Other content/);
  await expectFileToMatch(`${baseDir}/fr/main-es2015.js`, /Other content/);
  await expectToFail(() => ng('build', '--configuration=fr'));
}
