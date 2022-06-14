import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { externalServer, langTranslations, setupI18nConfig } from './setup';

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  const { stderr } = await ng('build');
  if (/Locale data for .+ cannot be found/.test(stderr)) {
    throw new Error(
      `A warning for a locale not found was shown. This should not happen.\n\nSTDERR:\n${stderr}\n`,
    );
  }

  for (const { lang, outputPath, translation } of langTranslations) {
    await expectFileToMatch(`${outputPath}/main.js`, translation.helloPartial);
    await expectToFail(() => expectFileToMatch(`${outputPath}/main.js`, '$localize`'));

    // Ensure locale is inlined (@angular/localize plugin inlines `$localize.locale` references)
    // The only reference in a new application is in @angular/core
    await expectFileToMatch(`${outputPath}/vendor.js`, lang);

    // Verify the HTML lang attribute is present
    await expectFileToMatch(`${outputPath}/index.html`, `lang="${lang}"`);

    // Execute Application E2E tests for a production build without dev server
    const { server, port, url } = await externalServer(outputPath, `/${lang}/`);
    try {
      await ng(
        'e2e',
        `--port=${port}`,
        `--configuration=${lang}`,
        '--dev-server-target=',
        `--base-url=${url}`,
      );
    } finally {
      server.close();
    }
  }
}
