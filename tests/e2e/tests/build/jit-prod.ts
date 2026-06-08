import { getGlobalVariable } from '../../utils/env';
import { updateJsonFile } from '../../utils/project';
import { executeBrowserTest } from '../../utils/puppeteer';

export default async function () {
  // Make prod use JIT.
  await updateJsonFile('angular.json', (configJson) => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect.build.configurations['production'].aot = false;

    // JIT applications have significantly larger sizes
    appArchitect.build.configurations['production'].budgets = [];

    if (!getGlobalVariable('argv')['esbuild']) {
      // The build optimizer option does not exist with the application build system
      appArchitect.build.configurations['production'].buildOptimizer = false;
    }
  });

  // Test it works
  await executeBrowserTest({ configuration: 'production' });
}
