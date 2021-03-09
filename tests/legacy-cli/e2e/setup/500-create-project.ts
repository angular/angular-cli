import { join } from 'path';
import { getGlobalVariable } from '../utils/env';
import { expectFileToExist, writeFile } from '../utils/fs';
import { gitClean } from '../utils/git';
import { ng, npm } from '../utils/process';
import { prepareProjectForE2e, updateJsonFile } from '../utils/project';

export default async function() {
  const argv = getGlobalVariable('argv');

  if (argv.noproject) {
    return;
  }

  if (argv.reuse) {
    process.chdir(argv.reuse);
    await gitClean();
  } else {
    const extraArgs = [];
    const testRegistry = getGlobalVariable('package-registry');
    const isCI = getGlobalVariable('ci');

    // Ensure local test registry is used when outside a project
    if (isCI) {
      // Safe to set a user configuration on CI
      await npm('config', 'set', 'registry', testRegistry);
    } else {
      // Yarn does not use the environment variable so an .npmrc file is also required
      await writeFile('.npmrc', `registry=${testRegistry}`);
      process.env['NPM_CONFIG_REGISTRY'] = testRegistry;
    }

    await ng('new', 'test-project', '--skip-install', ...extraArgs);
    await expectFileToExist(join(process.cwd(), 'test-project'));
    process.chdir('./test-project');

    // If on CI, the user configuration set above will handle project usage
    if (!isCI) {
      // Ensure local test registry is used inside a project
      await writeFile('.npmrc', `registry=${testRegistry}`);
    }

    if (argv['ve']) {
      await updateJsonFile('tsconfig.json', config => {
        const { angularCompilerOptions = {} } = config;
        angularCompilerOptions.enableIvy = false;
        config.angularCompilerOptions = angularCompilerOptions;
      });

      // In VE non prod builds are non AOT by default
      await updateJsonFile('angular.json', config => {
        const build = config.projects['test-project'].architect.build;
        build.options.aot = true;
        build.configurations.development.aot = false;
      });
    }
  }

  await prepareProjectForE2e('test-project');
  await ng('version');
}
