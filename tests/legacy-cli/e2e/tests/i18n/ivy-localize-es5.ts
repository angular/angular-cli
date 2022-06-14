import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { langTranslations, setupI18nConfig } from './setup';

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  // Ensure a es5 build is used.
  await updateJsonFile('tsconfig.json', (config) => {
    config.compilerOptions.target = 'es5';
  });

  // Build each locale and verify the output.
  await ng('build');

  for (const { lang, outputPath, translation } of langTranslations) {
    await expectFileToMatch(`${outputPath}/main.js`, translation.helloPartial);
    await expectToFail(() => expectFileToMatch(`${outputPath}/main.js`, '$localize`'));

    // Ensure locale is inlined (@angular/localize plugin inlines `$localize.locale` references)
    // The only reference in a new application is in @angular/core
    await expectFileToMatch(`${outputPath}/vendor.js`, lang);

    // Verify the HTML lang attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `lang="${lang}"`);
  }
}
