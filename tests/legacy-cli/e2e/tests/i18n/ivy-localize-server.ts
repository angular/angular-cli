import * as express from 'express';
import { join } from 'path';
import { getGlobalVariable } from '../../utils/env';
import {
  appendToFile,
  copyFile,
  expectFileToMatch,
  replaceInFile,
  writeFile,
} from '../../utils/fs';
import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { readNgVersion } from '../../utils/version';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];

  await updateJsonFile('package.json', packageJson => {
    const dependencies = packageJson['dependencies'];
    dependencies['@angular/localize'] = isSnapshotBuild
      ? snapshots.dependencies['@angular/localize']
      : readNgVersion();
  });

  // Add universal to the project
  await ng('add', '@nguniversal/express-engine@9.0.0-next.6', '--skip-install');

  if (isSnapshotBuild) {
    await updateJsonFile('package.json', packageJson => {
      const dependencies = packageJson['dependencies'];
      dependencies['@angular/platform-server'] = snapshots.dependencies['@angular/platform-server'];
    });
  }

  await silentNpm('install');

  const serverbaseDir = 'dist/test-project/server';
  const serverBuildArgs = ['run', 'test-project:server'];

  // Set configurations for each locale.
  const langTranslations = [
    // TODO: re-enable all locales once localeData support is added.
    // { lang: 'en-US', translation: 'Hello i18n!' },
    { lang: 'fr', translation: 'Bonjour i18n!' },
  ];

  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    const appArchitect = appProject.architect || appProject.targets;
    const buildOptions = appArchitect['build'].options;
    const serverOptions = appArchitect['server'].options;

    // Make default builds prod.
    buildOptions.optimization = true;
    buildOptions.buildOptimizer = true;
    buildOptions.aot = true;
    buildOptions.fileReplacements = [
      {
        replace: 'src/environments/environment.ts',
        with: 'src/environments/environment.prod.ts',
      },
    ];

    serverOptions.optimization = true;
    serverOptions.fileReplacements = [
      {
        replace: 'src/environments/environment.ts',
        with: 'src/environments/environment.prod.ts',
      },
    ];

    // Enable localization for all locales
    // TODO: re-enable all locales once localeData support is added.
    // buildOptions.localize = true;
    // serverOptions.localize = true;
    buildOptions.localize = ['fr'];
    serverOptions.localize = ['fr'];
    // Always error on missing translations.
    buildOptions.i18nMissingTranslation = 'error';
    serverOptions.i18nMissingTranslation = 'error';

    // Add locale definitions to the project
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = (appProject.i18n = { locales: {} });
    for (const { lang } of langTranslations) {
      if (lang == 'en-US') {
        i18n.sourceLocale = lang;
      } else {
        i18n.locales[lang] = `src/locale/messages.${lang}.xlf`;
      }
    }
  });

  // Add a translatable element.
  await writeFile(
    'src/app/app.component.html',
    '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>',
  );

  // Override 'main.ts' so that we never bootstrap the client side
  // This is needed so that we can we can run E2E test against the server view
  await writeFile(
    'src/main.ts',
    `
      import { enableProdMode } from '@angular/core';

      import { AppModule } from './app/app.module';
      import { environment } from './environments/environment';

      if (environment.production) {
        enableProdMode();
      }
    `,
  );

  // By default the 'server.ts' doesn't support localized dist folders,
  // so we create a copy of 'app' function with a locale parameter.
  await appendToFile(
    'server.ts',
    `
      export function i18nApp(locale: string) {
        const server = express();
        const distFolder = join(process.cwd(), \`dist/test-project/browser/\${locale}\`);

        server.engine('html', ngExpressEngine({
          bootstrap: AppServerModule,
        }));

        server.set('view engine', 'html');
        server.set('views', distFolder);

        server.get('*.*', express.static(distFolder, {
          maxAge: '1y'
        }));

        server.get('*', (req, res) => {
          res.render('index', { req });
        });

        return server;
      }
    `,
  );

  // Extract the translation messages and copy them for each language.
  await ng('xi18n', '--output-path=src/locale');

  for (const { lang, translation } of langTranslations) {
    if (lang !== 'en-US') {
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
  await ng('build');
  await ng(...serverBuildArgs);

  for (const { lang, translation } of langTranslations) {
    await expectFileToMatch(`${serverbaseDir}/${lang}/main.js`, translation);
    await expectToFail(() => expectFileToMatch(`${serverbaseDir}/${lang}/main.js`, '$localize`'));

    // Add E2E test for locale
    await writeFile(
      'e2e/src/app.e2e-spec.ts',
      `
      import { browser, logging, by } from 'protractor';
      describe('workspace-project App', () => {
        it('should display welcome message', () => {
          // Load the page without waiting for Angular since it is not bootstrapped automatically.
          browser.driver.get(browser.baseUrl);

          const header = browser.driver.findElement(by.css('h1'));
          expect(header.getText()).toEqual('${translation}');
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

    // Run the server
    const serverBundle = join(process.cwd(), `${serverbaseDir}/${lang}/main.js`);
    const { i18nApp } = await import(serverBundle) as { i18nApp(locale: string): express.Express };
    const server = i18nApp(lang).listen(4200, 'localhost');
    try {
      // Execute without a devserver.
      await ng('e2e', '--devServerTarget=');
    } finally {
      server.close();
    }
  }

  // Verify missing translation behaviour.
  await appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');
  await ng(...serverBuildArgs, '--i18n-missing-translation', 'ignore');
  await expectFileToMatch(`${serverbaseDir}/fr/main.js`, /Other content/);
  await expectToFail(() => ng(...serverBuildArgs));
}
