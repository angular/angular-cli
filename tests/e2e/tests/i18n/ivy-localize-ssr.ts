import { readFileSync, readdirSync } from 'node:fs';
import { getGlobalVariable } from '../../utils/env';
import { installWorkspacePackages, uninstallPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { updateJsonFile, useSha } from '../../utils/project';
import { langTranslations, setupI18nConfig } from './setup';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    // This test is for the `application` builder only
    return;
  }

  // Setup i18n tests and config.
  await setupI18nConfig();

  // Update angular.json
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    // tslint:disable-next-line: no-any
    const i18n: Record<string, any> = appProject.i18n;

    i18n.sourceLocale = {
      baseHref: '',
    };

    i18n.locales['fr'] = {
      translation: i18n.locales['fr'],
      baseHref: '',
    };

    i18n.locales['de'] = {
      translation: i18n.locales['de'],
      baseHref: '',
    };
  });

  // forcibly remove in case another test doesn't clean itself up
  await uninstallPackage('@angular/ssr');

  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');

  await useSha();
  await installWorkspacePackages();

  // Build each locale and verify the output.
  await ng('build', '--output-hashing=none');

  for (const { lang, translation } of langTranslations) {
    let foundTranslation = false;
    let foundLocaleData = false;

    // The translation may be in any of the lazy-loaded generated chunks
    for (const entry of readdirSync(`dist/test-project/server/${lang}/`)) {
      if (!entry.endsWith('.mjs')) {
        continue;
      }

      const contents = readFileSync(`dist/test-project/server/${lang}/${entry}`, 'utf-8');

      // Check for translated content
      foundTranslation ||= contents.includes(translation.helloPartial);
      // Check for the locale data month name to be present
      foundLocaleData ||= contents.includes(translation.date);

      if (foundTranslation && foundLocaleData) {
        break;
      }
    }

    if (!foundTranslation) {
      throw new Error(`Translation not found in 'dist/test-project/server/${lang}/'`);
    }

    if (!foundLocaleData) {
      throw new Error(`Locale data not found in 'dist/test-project/server/${lang}/'`);
    }
  }
}
