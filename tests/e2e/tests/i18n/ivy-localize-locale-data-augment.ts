import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, prependToFile, readFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { executeBrowserTest } from '../../utils/puppeteer';
import { browserCheck, langTranslations, setupI18nConfig } from './setup';

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  // Update angular.json to only localize one locale
  await updateJsonFile('angular.json', (workspaceJson) => {
    const appProject = workspaceJson.projects['test-project'];
    appProject.architect['build'].options.localize = ['fr'];
  });

  // Augment the locale data and import into the main application file
  const localeData = await readFile('node_modules/@angular/common/locales/global/fr.js');
  await writeFile('src/fr-changed.js', localeData.replace('janvier', 'changed-janvier'));
  await prependToFile('src/main.ts', "import './fr-changed.js';\n");

  // Run a build and test
  await ng('build');
  for (const { lang, outputPath } of langTranslations) {
    // Only the fr locale was built for this test
    if (lang !== 'fr') {
      continue;
    }

    const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
    if (useWebpackBuilder) {
      // The only reference in a new application with Webpack is in @angular/core
      await expectFileToMatch(`${outputPath}/vendor.js`, lang);
    } else {
      await expectFileToMatch(`${outputPath}/polyfills.js`, lang);
    }

    // Execute Application E2E tests with dev server
    await executeBrowserTest({
      configuration: lang,
      checkFn: async (page) => {
        // Run standard checks but expect failure on date
        try {
          await browserCheck(page, lang);
          throw new Error('Expected browserCheck to fail due to modified locale data');
        } catch (e) {
          if (!(e instanceof Error) || !e.message.includes("Expected 'date' to be")) {
            throw e;
          }
        }

        // Verify the modified date
        const getParagraph = async (id: string) =>
          page.$eval(`p#${id}`, (el) => el.textContent?.trim());
        const date = await getParagraph('date');
        if (date !== 'changed-janvier') {
          throw new Error(`Expected 'date' to be 'changed-janvier', but got '${date}'.`);
        }
      },
    });
  }
}
