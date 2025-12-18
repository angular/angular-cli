import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';
import { updateJsonFile, useCIDefaults } from '../../utils/project';
import { executeBrowserTest } from '../../utils/puppeteer';

export default async function () {
  await ng('generate', 'app', 'test-project-two', '--no-standalone', '--skip-install');
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
        outputPath: 'dist/test-project-two',
        index: 'src/index.html',
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

    const serve = json['projects']['test-project-two']['architect']['serve'];
    serve.builder = '@angular-devkit/build-angular:dev-server';
  });
  // Test it works
  await executeBrowserTest({ project: 'test-project-two', configuration: 'production' });
  await executeBrowserTest({ project: 'test-project-two', configuration: 'development' });
}
