import { setTimeout } from 'node:timers/promises';
import { updateJsonFile } from '../../../utils/project';
import { ng } from '../../../utils/process';
import { libraryConsumptionSetup } from './setup';
import { getGlobalVariable } from '../../../utils/env';

export default async function () {
  await libraryConsumptionSetup();

  // Build library in partial mode (production)
  await ng('build', 'my-lib', '--configuration=production');

  // JIT linking
  await updateJsonFile('angular.json', (config) => {
    const build = config.projects['test-project'].architect.build;
    build.options.aot = false;
    build.configurations.production.budgets = undefined;

    if (!getGlobalVariable('argv')['esbuild']) {
      build.configurations.production.buildOptimizer = false;
    }
  });

  // Check that the e2e succeeds prod and non prod mode
  await ng('e2e', '--configuration=production');
  await setTimeout(500);
  await ng('e2e', '--configuration=development');
}
