import { executeTest } from './ivy-localize-dl-xliff2';
import { setupI18nConfig } from './legacy';

export default async function() {
  // Setup i18n tests and config.
  await setupI18nConfig(true, 'xlf');

  // Execute the tests
  await executeTest();
}
