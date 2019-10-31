import { expectFileNotToExist, expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { externalServer, langTranslations, setupI18nConfig } from './legacy';

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig();

  // Ensure a es5 build is used.
  await updateJsonFile('tsconfig.json', config => {
    config.compilerOptions.target = 'es5';
    config.angularCompilerOptions.disableTypeScriptVersionCheck = true;
  });

  // TODO: re-enable all locales once localeData support is added.
  const tempLangTranslations = langTranslations.filter(l => l.lang == 'fr');

  // Build each locale and verify the output.
  await ng('build');
  for (const { lang, outputPath, translation } of tempLangTranslations) {
    await expectFileToMatch(`${outputPath}/main.js`, translation.helloPartial);
    await expectToFail(() => expectFileToMatch(`${outputPath}/main.js`, '$localize`'));
    await expectFileNotToExist(`${outputPath}/main-es2015.js`);
    await expectFileToMatch(`${outputPath}/main.js`, lang);

    const server = externalServer(outputPath);
    try {
      // Execute without a devserver.
      await ng('e2e', `--configuration=${lang}`, '--devServerTarget=');
    } finally {
      server.close();
    }
  }
}
