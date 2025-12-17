import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

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
  await ng('e2e', '--configuration=production');
}
