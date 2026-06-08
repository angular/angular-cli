import { executeBrowserTest } from '../../utils/puppeteer';
import { browserCheck, langTranslations, setupI18nConfig } from './setup';

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  for (const { lang } of langTranslations) {
    await executeBrowserTest({
      configuration: lang,
      checkFn: (page) => browserCheck(page, lang),
    });
  }
}
