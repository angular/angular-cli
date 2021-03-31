import { executeTest } from './ivy-localize-dl-xliff2';
import { setupI18nConfig } from './setup';

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig('xmb');

  // Execute the tests
  await executeTest();
}
