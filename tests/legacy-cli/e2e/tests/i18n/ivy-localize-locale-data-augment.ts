import { expectFileToMatch, prependToFile, readFile, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { externalServer, langTranslations, setupI18nConfig } from './setup';

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig();

  // Update angular.json to only localize one locale
  await updateJsonFile('angular.json', workspaceJson => {
    const appProject = workspaceJson.projects['test-project'];
    appProject.architect['build'].options.localize = ['fr'];
  });

  // Update E2E test to look for augmented locale data
  await replaceInFile('./e2e/src/app.fr.e2e-spec.ts', 'janvier', 'changed-janvier');

  // Augment the locale data and import into the main application file
  const localeData = await readFile('node_modules/@angular/common/locales/global/fr.js');
  await writeFile('src/fr-changed.js', localeData.replace('janvier', 'changed-janvier'));
  await prependToFile('src/main.ts', 'import \'./fr-changed.js\';\n');

  // Run a build and test
  await ng('build');
  for (const { lang, outputPath } of langTranslations) {
    // Only the fr locale was built for this test
    if (lang !== 'fr') {
      continue;
    }

    // Ensure locale is inlined (@angular/localize plugin inlines `$localize.locale` references)
    // The only reference in a new application is in @angular/core
    await expectFileToMatch(`${outputPath}/vendor.js`, lang);

    // Execute Application E2E tests with dev server
    await ng('e2e', `--configuration=${lang}`, '--port=0');

    // Execute Application E2E tests for a production build without dev server
    const server = externalServer(outputPath, `/${lang}/`);
    try {
      await ng(
        'e2e',
        `--configuration=${lang}`,
        '--devServerTarget=',
        `--baseUrl=http://localhost:4200/${lang}/`,
      );
    } finally {
      server.close();
    }
  }
}
