import { updateJsonFile } from '../../../utils/project';
import { expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { executeBrowserTest } from '../../../utils/puppeteer';
import { browserCheck, libraryConsumptionSetup } from './setup';
import { getGlobalVariable } from '../../../utils/env';

export default async function () {
  await libraryConsumptionSetup();

  // Build library in full mode (development)
  await ng('build', 'my-lib', '--configuration=development');

  // JIT linking
  await updateJsonFile('angular.json', (config) => {
    const build = config.projects['test-project'].architect.build;
    build.options.aot = false;
    build.configurations.production.budgets = undefined;
    if (!getGlobalVariable('argv')['esbuild']) {
      build.configurations.production.buildOptimizer = false;
    }
  });

  // Ensure app works in prod and non prod mode
  await executeBrowserTest({ configuration: 'production', checkFn: browserCheck });
  await executeBrowserTest({ configuration: 'development', checkFn: browserCheck });

  // Validate that sourcemaps for the library exists.
  await ng('build', '--configuration=development');
  await expectFileToMatch(
    'dist/test-project/browser/main.js.map',
    'projects/my-lib/src/lib/my-lib.ts',
  );
}
