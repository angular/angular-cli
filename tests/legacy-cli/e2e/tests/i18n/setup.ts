import * as express from 'express';
import { resolve } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, copyFile, expectFileToExist, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { installPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
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
  'json': {
    ext: 'json',
    sourceCheck: '"locale": "en-US"',
    replacements: [
    ],
  },
  'arb': {
    ext: 'arb',
    sourceCheck: '"@@locale": "en-US"',
    replacements: [
    ],
  },
};

export async function setupI18nConfig(format: keyof typeof formats = 'xlf') {
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
        const getParagraph = async (name: string) => element(by.css('app-root p#' + name)).getText();
        beforeEach(() => browser.get(browser.baseUrl));
        afterEach(async () => {
          // Assert that there are no errors emitted from the browser
          const logs = await browser.manage().logs().get(logging.Type.BROWSER);
          expect(logs).not.toContain(jasmine.objectContaining({
            level: logging.Level.SEVERE,
          } as logging.Entry));
        });

        it('should display welcome message', async () =>
          expect(await getParagraph('hello')).toEqual('${translation.hello}'));

        it('should display locale', async () =>
          expect(await getParagraph('locale')).toEqual('${lang}'));

        it('should display localized date', async () =>
          expect(await getParagraph('date')).toEqual('${translation.date}'));

        it('should display pluralized message', async () =>
          expect(await getParagraph('plural')).toEqual('${translation.plural}'));
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

    appArchitect['build'].defaultConfiguration = undefined;

    // Always error on missing translations.
    appArchitect['build'].options.optimization = true;
    appArchitect['build'].options.buildOptimizer = true;
    appArchitect['build'].options.aot = true;
    appArchitect['build'].options.fileReplacements = [{
      replace: 'src/environments/environment.ts',
      with: 'src/environments/environment.prod.ts',
    }];
    appArchitect['build'].options.i18nMissingTranslation = 'error';
    appArchitect['build'].options.vendorChunk = true;
    appArchitect['build'].options.sourceMap = true;
    appArchitect['build'].options.outputHashing = 'none';

    // Enable localization for all locales
    appArchitect['build'].options.localize = true;

    // Add i18n config items (app, build, serve, e2e).
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = (appProject.i18n = { locales: {} });
    for (const { lang } of langTranslations) {
      if (lang === sourceLocale) {
        i18n.sourceLocale = lang;
      } else {
        i18n.locales[lang] = `src/locale/messages.${lang}.${formats[format].ext}`;
      }

      buildConfigs[lang] = { localize: [lang] };

      serveConfigs[lang] = { browserTarget: `test-project:build:${lang}` };
      e2eConfigs[lang] = {
        specs: [`./src/app.${lang}.e2e-spec.ts`],
        devServerTarget: `test-project:serve:${lang}`,
      };
    }
  });

// Install the localize package if using ivy
  let localizeVersion = '@angular/localize@' + readNgVersion();
  if (getGlobalVariable('argv')['ng-snapshots']) {
    localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
  }
  await installPackage(localizeVersion);

  // Extract the translation messages.
  await ng(
    'extract-i18n',
    '--output-path=src/locale',
    `--format=${format}`,
  );
  const translationFile = `src/locale/messages.${formats[format].ext}`;
  await expectFileToExist(translationFile);
  await expectFileToMatch(translationFile, formats[format].sourceCheck);

  if (format !== 'json') {
    await expectFileToMatch(translationFile, `An introduction header for this sample`);
  }

  // Make translations for each language.
  for (const { lang, translationReplacements } of langTranslations) {
    if (lang != sourceLocale) {
      await copyFile(translationFile, `src/locale/messages.${lang}.${formats[format].ext}`);
      for (const replacements of translationReplacements) {
        await replaceInFile(
          `src/locale/messages.${lang}.${formats[format].ext}`,
          new RegExp(replacements[0], 'g'),
          replacements[1] as string,
        );
      }
      for (const replacement of formats[format].replacements) {
        await replaceInFile(
          `src/locale/messages.${lang}.${formats[format].ext}`,
          new RegExp(replacement[0], 'g'),
          replacement[1] as string,
        );
      }
    }
  }
}
