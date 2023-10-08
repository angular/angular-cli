import { readFileSync, readdirSync } from 'node:fs';
import { getGlobalVariable } from '../../utils/env';
import { copyFile, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { updateJsonFile, useSha } from '../../utils/project';
import { readNgVersion } from '../../utils/version';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    // This test is for the `application` builder only
    return;
  }

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  await updateJsonFile('package.json', (packageJson) => {
    const dependencies = packageJson['dependencies'];
    dependencies['@angular/localize'] = isSnapshotBuild
      ? snapshots.dependencies['@angular/localize']
      : readNgVersion();
  });

  // forcibly remove in case another test doesn't clean itself up
  await uninstallPackage('@angular/ssr');

  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');

  await useSha();
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
  await ng('build', '--output-hashing=none');

  for (const { lang, translation } of langTranslations) {
    let foundTranslation = false;

    // The translation may be in any of the lazy-loaded generated chunks
    for (const entry of readdirSync(`dist/test-project/server/${lang}/`)) {
      if (!entry.endsWith('.mjs')) {
        continue;
      }

      const contents = readFileSync(`dist/test-project/server/${lang}/${entry}`, 'utf-8');
      foundTranslation ||= contents.includes(translation);
      if (foundTranslation) {
        break;
      }
    }

    if (!foundTranslation) {
      throw new Error(`Translation not found in 'dist/test-project/server/${lang}/'`);
    }
  }
}
