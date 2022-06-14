import { updateJsonFile } from '../../../utils/project';
import { expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { libraryConsumptionSetup } from './setup';

export default async function () {
  await libraryConsumptionSetup();

  // Build library in full mode (development)
  await ng('build', 'my-lib', '--configuration=development');

  // JIT linking
  await updateJsonFile('angular.json', (config) => {
    const build = config.projects['test-project'].architect.build;
    build.options.aot = false;
    build.configurations.production.buildOptimizer = false;
  });

  // Check that the e2e succeeds prod and non prod mode
  await ng('e2e', '--configuration=production');
  await ng('e2e', '--configuration=development');

  // Validate that sourcemaps for the library exists.
  await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/main.js.map', 'projects/my-lib/src/public-api.ts');
}
