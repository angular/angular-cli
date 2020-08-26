import * as express from 'express';
import { join } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, expectFileToMatch, writeFile } from '../../utils/fs';
import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { langTranslations, setupI18nConfig } from './legacy';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  // TODO: Re-enable pending further Ivy/Universal/i18n work
  return;

  // Setup i18n tests and config.
  await setupI18nConfig();

  // Add universal to the project
  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
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

  // Add server-specific config.
  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    const appArchitect = appProject.architect || appProject.targets;
    const serverOptions = appArchitect['server'].options;

    serverOptions.optimization = true;
    serverOptions.fileReplacements = [
      {
        replace: 'src/environments/environment.ts',
        with: 'src/environments/environment.prod.ts',
      },
    ];

    // Enable localization for all locales
    // TODO: re-enable all locales once localeData support is added.
    // serverOptions.localize = true;
    serverOptions.localize = ['fr'];
    // Always error on missing translations.
    serverOptions.i18nMissingTranslation = 'error';
  });

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

  // Build each locale and verify the output.
  await ng('build');
  await ng(...serverBuildArgs);

  for (const { lang, translation } of langTranslations) {
    await expectFileToMatch(`${serverbaseDir}/${lang}/main.js`, translation.helloPartial);
    await expectToFail(() => expectFileToMatch(`${serverbaseDir}/${lang}/main.js`, '$localize`'));

    // Run the server
    const serverBundle = join(process.cwd(), `${serverbaseDir}/${lang}/main.js`);
    const { i18nApp } = await import(serverBundle) as { i18nApp(locale: string): express.Express };
    const server = i18nApp(lang).listen(4200, 'localhost');
    try {
      // Execute without a devserver.
      await ng('e2e', `--configuration=${lang}`, '--devServerTarget=');
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
