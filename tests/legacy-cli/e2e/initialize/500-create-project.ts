import { join } from 'path';
import yargsParser from 'yargs-parser';
import { getGlobalVariable } from '../utils/env';
import { expectFileToExist } from '../utils/fs';
import { gitClean } from '../utils/git';
import { installPackage, setRegistry as setNPMConfigRegistry } from '../utils/packages';
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

    // Install puppeteer in the parent directory for use by the CLI within any test project.
    // Align the version with the primary project package.json.
    const puppeteerVersion = require('../../../../package.json').devDependencies.puppeteer.replace(
      /^[\^~]/,
      '',
    );
    await installPackage(`puppeteer@${puppeteerVersion}`);

    await ng('new', 'test-project', '--skip-install');
    await expectFileToExist(join(process.cwd(), 'test-project'));
    process.chdir('./test-project');

    // Setup esbuild builder if requested on the commandline
    const useEsbuildBuilder = !!getGlobalVariable('argv')['esbuild'];
    if (useEsbuildBuilder) {
      await updateJsonFile('angular.json', (json) => {
        json['projects']['test-project']['architect']['build']['builder'] =
          '@angular-devkit/build-angular:browser-esbuild';
      });
    }
  }

  await prepareProjectForE2e('test-project');
  await ng('version');
}
