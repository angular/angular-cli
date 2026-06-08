import { ng } from '../../../utils/process';
import { executeBrowserTest } from '../../../utils/puppeteer';
import { browserCheck, libraryConsumptionSetup } from './setup';

export default async function () {
  await libraryConsumptionSetup();

  // Build library in partial mode (production)
  await ng('build', 'my-lib', '--configuration=production');

  // Check that the e2e succeeds prod and non prod mode
  await executeBrowserTest({ configuration: 'production', checkFn: browserCheck });
  await executeBrowserTest({ configuration: 'development', checkFn: browserCheck });
}
