import { appendToFile, expectFileToMatch } from '../../utils/fs';
import { execAndWaitForOutputToMatch, killAllProcesses, ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { baseDir, externalServer, langTranslations, setupI18nConfig } from './legacy';

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig(true, 'xlf2');

  // Execute the tests
  await executeTest();
}

export async function executeTest() {
  // Ensure a DL build is used.
  await updateJsonFile('tsconfig.json', config => {
    config.compilerOptions.target = 'es2015';
    config.angularCompilerOptions.disableTypeScriptVersionCheck = true;
  });

  // Build each locale and verify the output.
  await ng('build');
  for (const { lang, outputPath, translation } of langTranslations) {
    await expectFileToMatch(`${outputPath}/main-es5.js`, translation.helloPartial);
    await expectFileToMatch(`${outputPath}/main-es2015.js`, translation.helloPartial);
    await expectToFail(() => expectFileToMatch(`${outputPath}/main-es5.js`, '$localize`'));
    await expectToFail(() => expectFileToMatch(`${outputPath}/main-es2015.js`, '$localize`'));

    // Verify the locale ID is present
    await expectFileToMatch(`${outputPath}/vendor-es5.js`, lang);
    await expectFileToMatch(`${outputPath}/vendor-es2015.js`, lang);

    // Verify the HTML lang attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `lang="${lang}"`);

    // Verify the HTML base HREF attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `href="/${lang}/"`);

    // Verify the locale data is registered using the global files
    await expectFileToMatch(`${outputPath}/vendor-es5.js`, '.ng.common.locales');
    await expectFileToMatch(`${outputPath}/vendor-es2015.js`, '.ng.common.locales');

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

  // Verify deprecated locale data registration is not present
  await ng('build', '--configuration=fr', '--optimization=false');
  await expectToFail(() => expectFileToMatch(`${baseDir}/fr/main-es5.js`, 'registerLocaleData('));
  await expectToFail(() =>
    expectFileToMatch(`${baseDir}/fr/main-es2015.js`, 'registerLocaleData('),
  );

  // Verify missing translation behaviour.
  await appendToFile('src/app/app.component.html', '<p i18n>Other content</p>');
  await ng('build', '--i18n-missing-translation', 'ignore');
  await expectFileToMatch(`${baseDir}/fr/main-es5.js`, /Other content/);
  await expectFileToMatch(`${baseDir}/fr/main-es2015.js`, /Other content/);
  await expectToFail(() => ng('build'));
  try {
    await execAndWaitForOutputToMatch(
      'ng',
      ['serve', '--configuration=fr', '--port=0'],
      /No translation found for/,
    );
  } finally {
    killAllProcesses();
  }
}
