import { join } from 'path';
import { getGlobalVariable } from '../utils/env';
import { expectFileToExist } from '../utils/fs';
import { gitClean } from '../utils/git';
import { ng } from '../utils/process';
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

    await ng('new', 'test-project', '--skip-install', ...extraArgs);
    await expectFileToExist(join(process.cwd(), 'test-project'));
    process.chdir('./test-project');

    if (argv['ve']) {
      await updateJsonFile('tsconfig.json', config => {
        config.angularCompilerOptions.enableIvy = false;
      });

      // In VE non prod builds are non AOT by default
      await updateJsonFile('angular.json', config => {
        const build = config.projects['test-project'].architect.build;
        build.options.aot = false;
        build.configurations.production.aot = true;
      });
    }
  }

  await prepareProjectForE2e('test-project');
  await ng('version');
}
