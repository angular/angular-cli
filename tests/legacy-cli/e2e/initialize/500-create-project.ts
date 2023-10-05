import { join } from 'path';
import yargsParser from 'yargs-parser';
import { getGlobalVariable } from '../utils/env';
import { expectFileToExist } from '../utils/fs';
import { gitClean } from '../utils/git';
import { setRegistry as setNPMConfigRegistry } from '../utils/packages';
import { ng } from '../utils/process';
import { prepareProjectForE2e, updateJsonFile } from '../utils/project';

export default async function () {
  const argv = getGlobalVariable<yargsParser.Arguments>('argv');

  if (argv.noproject) {
    return;
  }

  if (argv.reuse) {
    process.chdir(argv.reuse);
    await gitClean();
  } else {
    // Ensure local test registry is used when outside a project
    await setNPMConfigRegistry(true);

    await ng('new', 'test-project', '--skip-install');
    await expectFileToExist(join(process.cwd(), 'test-project'));
    process.chdir('./test-project');

    // Setup esbuild builder if requested on the commandline
    const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
    if (useWebpackBuilder) {
      await updateJsonFile('angular.json', (json) => {
        const build = json['projects']['test-project']['architect']['build'];
        build.builder = '@angular-devkit/build-angular:browser';
        build.options = {
          ...build.options,
          main: build.options.browser,
          browser: undefined,
          outputPath: 'dist/test-project/browser',
        };

        build.configurations.development = {
          ...build.configurations.development,
          vendorChunk: true,
          namedChunks: true,
          buildOptimizer: false,
        };
      });
    }
  }

  await prepareProjectForE2e('test-project');
  await ng('version');
}
