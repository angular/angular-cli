import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, writeFile } from '../../utils/fs';
import { execAndWaitForOutputToMatch, ng, npm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { readNgVersion } from '../../utils/version';
import { baseDir, externalServer, langTranslations, setupI18nConfig } from './legacy';

export default async function() {
  if (!getGlobalVariable('argv')['ve']) {
    return;
  }

  // Setup i18n tests and config.
  await setupI18nConfig();

  // Using localize-based options requires the @angular/locale package
  let localizeVersion = '@angular/localize@' + readNgVersion();
  if (getGlobalVariable('argv')['ng-snapshots']) {
    localizeVersion = require('../../ng-snapshot/package.json').dependencies['@angular/localize'];
  }
  await npm('install', `${localizeVersion}`);

  // Ensure a ES2015 build is used.
  await writeFile('browserslist', 'Chrome 65');
  await updateJsonFile('tsconfig.json', config => {
    config.compilerOptions.target = 'es2015';
    config.angularCompilerOptions.disableTypeScriptVersionCheck = true;
  });

  // Attempts to build multiple locales with VE should fail
  await expectToFail(() => ng('build'));

  for (const { lang, outputPath, translation } of langTranslations) {
    await ng('build', `--configuration=${lang}`);

    await expectFileToMatch(`${outputPath}/main.js`, translation.helloPartial);
    await expectToFail(() => expectFileToMatch(`${outputPath}/main.js`, '$localize`'));

    // Verify the HTML lang attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `lang="${lang}"`);

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

  await execAndWaitForOutputToMatch(
    'ng',
    ['build', '--configuration=fr', '--i18n-locale=en-US'],
    /Option 'localize' and deprecated 'i18nLocale' found.  Using 'localize'./,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['build', '--configuration=fr', '--i18n-format=xmb'],
    /Option 'localize' and deprecated 'i18nFormat' found.  Using 'localize'./,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['build', '--configuration=fr', '--i18n-file=error.json'],
    /Option 'localize' and deprecated 'i18nFile' found.  Using 'localize'./,
  );
}
