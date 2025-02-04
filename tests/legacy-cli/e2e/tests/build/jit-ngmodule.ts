import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';
import { updateJsonFile, useCIChrome, useCIDefaults } from '../../utils/project';

export default async function () {
  await ng('generate', 'app', 'test-project-two', '--no-standalone', '--skip-install');
  await ng('generate', 'private-e2e', '--related-app-name=test-project-two');

  // Setup testing to use CI Chrome.
  await useCIChrome('test-project-two', './projects/test-project-two/e2e');
  await useCIDefaults('test-project-two');

  // Make prod use JIT.

  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  // Setup webpack builder if esbuild is not requested on the commandline
  await updateJsonFile('angular.json', (json) => {
    const build = json['projects']['test-project-two']['architect']['build'];
    if (useWebpackBuilder) {
      build.builder = '@angular-devkit/build-angular:browser';
      build.options = {
        ...build.options,
        main: build.options.browser,
        browser: undefined,
        buildOptimizer: false,
      };

      build.configurations.development = {
        ...build.configurations.development,
        vendorChunk: true,
        namedChunks: true,
      };
    }

    // Remove bundle budgets due to the increased size from JIT
    build.configurations.production = {
      ...build.configurations.production,
      budgets: undefined,
    };

    build.options.aot = false;
  });
  // Test it works
  await ng('e2e', 'test-project-two', '--configuration=production');
  await ng('e2e', 'test-project-two', '--configuration=development');
}
