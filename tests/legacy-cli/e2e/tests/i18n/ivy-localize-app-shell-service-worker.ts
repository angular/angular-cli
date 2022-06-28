import { getGlobalVariable } from '../../utils/env';
import { appendToFile, createDir, expectFileToMatch, writeFile } from '../../utils/fs';
import { installWorkspacePackages } from '../../utils/packages';
import { silentNg } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { readNgVersion } from '../../utils/version';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];

  await updateJsonFile('package.json', (packageJson) => {
    const dependencies = packageJson['dependencies'];
    dependencies['@angular/localize'] = isSnapshotBuild
      ? snapshots.dependencies['@angular/localize']
      : readNgVersion();
  });

  await appendToFile('src/app/app.component.html', '<router-outlet></router-outlet>');

  // Add app-shell and service-worker
  await silentNg('generate', 'app-shell');
  await silentNg('generate', 'service-worker');

  if (isSnapshotBuild) {
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      dependencies['@angular/platform-server'] = snapshots.dependencies['@angular/platform-server'];
      dependencies['@angular/service-worker'] = snapshots.dependencies['@angular/service-worker'];
      dependencies['@angular/router'] = snapshots.dependencies['@angular/router'];
    });
  }

  await installWorkspacePackages();

  const browserBaseDir = 'dist/test-project/browser';

  // Set configurations for each locale.
  const langTranslations = [
    { lang: 'en-US', translation: 'Hello i18n!' },
    { lang: 'fr', translation: 'Bonjour i18n!' },
  ];

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    const appArchitect = appProject.architect;
    const buildOptions = appArchitect['build'].options;
    const serverOptions = appArchitect['server'].options;

    // Enable localization for all locales
    buildOptions.localize = true;
    buildOptions.outputHashing = 'none';
    serverOptions.localize = true;
    serverOptions.outputHashing = 'none';

    // Add locale definitions to the project
    const i18n: Record<string, any> = (appProject.i18n = { locales: {} });
    for (const { lang } of langTranslations) {
      if (lang == 'en-US') {
        i18n.sourceLocale = lang;
      } else {
        i18n.locales[lang] = `src/locale/messages.${lang}.xlf`;
      }
    }
  });

  await createDir('src/locale');

  for (const { lang } of langTranslations) {
    // dummy translation file.
    await writeFile(
      `src/locale/messages.${lang}.xlf`,
      `
        <?xml version='1.0' encoding='utf-8'?>
        <xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
        </xliff>
      `,
    );
  }

  // Build each locale and verify the SW output.
  await silentNg('run', 'test-project:app-shell:development');
  for (const { lang } of langTranslations) {
    await Promise.all([
      expectFileToMatch(`${browserBaseDir}/${lang}/ngsw.json`, `/${lang}/main.js`),
      expectFileToMatch(`${browserBaseDir}/${lang}/ngsw.json`, `/${lang}/index.html`),
    ]);
  }
}
