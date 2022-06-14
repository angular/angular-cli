import { ng } from '../../utils/process';
import { langTranslations, setupI18nConfig } from './setup';

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  for (const { lang } of langTranslations) {
    // Execute Application E2E tests with dev server
    await ng('e2e', `--configuration=${lang}`, '--port=0');
  }
}
