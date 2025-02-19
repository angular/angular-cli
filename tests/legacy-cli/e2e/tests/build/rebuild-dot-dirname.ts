import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, createDir, rimraf } from '../../utils/fs';
import { installWorkspacePackages } from '../../utils/packages';
import { killAllProcesses, ng, waitForAnyProcessOutputToMatch } from '../../utils/process';
import { ngServe, updateJsonFile, useSha } from '../../utils/project';
import { rm } from 'node:fs/promises';

const goodRegEx = getGlobalVariable('argv')['esbuild']
  ? /Application bundle generation complete\./
  : / Compiled successfully\./;

export default async function () {
  const originalCwd = process.cwd();
  // Delete angular.json so that we can create a new app.
  await rimraf('angular.json');
  await createDir('./.subdirectory');

  try {
    process.chdir('./.subdirectory');

    await ng('new', 'subdirectory-test-project', '--skip-install');
    process.chdir('./subdirectory-test-project');

    await useSha();
    await installWorkspacePackages();

    const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
    if (useWebpackBuilder) {
      await updateJsonFile('angular.json', (json) => {
        const build = json['projects']['subdirectory-test-project']['architect']['build'];
        build.builder = '@angular-devkit/build-angular:browser';
        build.options = {
          ...build.options,
          main: build.options.browser,
          browser: undefined,
        };

        build.configurations.development = {
          ...build.configurations.development,
          vendorChunk: true,
          namedChunks: true,
          buildOptimizer: false,
        };
      });
    }

    await ngServe();

    // Wait before editing a file.
    await setTimeout(1000);
    await appendToFile('src/main.ts', 'console.log(1);');
    await waitForAnyProcessOutputToMatch(goodRegEx);
  } finally {
    process.chdir(originalCwd);
    await killAllProcesses();
    await setTimeout(500);
  }
}
