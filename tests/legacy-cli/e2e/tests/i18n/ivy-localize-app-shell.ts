import { getGlobalVariable } from '../../utils/env';
import {
  appendToFile,
  copyFile,
  expectFileToMatch,
  replaceInFile,
  writeFile,
} from '../../utils/fs';
import { installWorkspacePackages } from '../../utils/packages';
import { ng } from '../../utils/process';
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
  await ng('generate', 'app-shell', '--project', 'test-project');

  if (isSnapshotBuild) {
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      dependencies['@angular/platform-server'] = snapshots.dependencies['@angular/platform-server'];
      dependencies['@angular/router'] = snapshots.dependencies['@angular/router'];
    });
  }

  await installWorkspacePackages();

  // Set configurations for each locale.
  const langTranslations = [
    { lang: 'en-US', translation: 'Hello i18n!' },
    { lang: 'fr', translation: 'Bonjour i18n!' },
  ];

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    const appArchitect = appProject.architect || appProject.targets;
    const buildOptions = appArchitect['build'].options;

    // Enable localization for all locales
    buildOptions.localize = true;

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

  await writeFile(
    'src/app/app-shell/app-shell.component.html',
    '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>',
  );

  // Add a translatable element
  // Extraction of i18n only works on browser targets.
  // Let's add the same translation that there is in the app-shell
  await writeFile(
    'src/app/app.component.html',
    '<h1 i18n="An introduction header for this sample">Hello i18n!</h1>',
  );

  // Extract the translation messages and copy them for each language.
  await ng('extract-i18n', '--output-path=src/locale');
  await expectFileToMatch('src/locale/messages.xlf', `source-language="en-US"`);
  await expectFileToMatch('src/locale/messages.xlf', `An introduction header for this sample`);

  // Clean up app.component.html so that we can easily
  // find the translation text
  await writeFile('src/app/app.component.html', '<router-outlet></router-outlet>');

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
  await ng('build', '--output-mode=static');

  for (const { lang, translation } of langTranslations) {
    await expectFileToMatch(`dist/test-project/browser/${lang}/index.html`, translation);
  }
}
