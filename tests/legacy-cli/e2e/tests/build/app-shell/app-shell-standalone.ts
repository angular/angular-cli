import { getGlobalVariable } from '../../../utils/env';
import { expectFileToMatch } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

const snapshots = require('../../../ng-snapshot/package.json');

export default async function () {
  await ng('generate', 'app', 'test-project-two', '--routing', '--standalone', '--skip-install');

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
      };

      build.configurations.development = {
        ...build.configurations.development,
        vendorChunk: true,
        namedChunks: true,
        buildOptimizer: false,
      };
    } else {
      // TODO(alanagius): enable once esbuild supports standalone route extraction.
      build.configurations.production.prerender = false;
    }
  });

  await ng('generate', 'app-shell', '--project', 'test-project-two');

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  if (isSnapshotBuild) {
    const packagesToInstall: string[] = [];
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      // Iterate over all of the packages to update them to the snapshot version.
      for (const [name, version] of Object.entries(
        snapshots.dependencies as { [p: string]: string },
      )) {
        if (name in dependencies && dependencies[name] !== version) {
          packagesToInstall.push(version);
        }
      }
    });

    for (const pkg of packagesToInstall) {
      await installPackage(pkg);
    }
  }

  if (useWebpackBuilder) {
    await ng('run', 'test-project-two:app-shell:development');
    await expectFileToMatch('dist/test-project-two/browser/index.html', 'app-shell works!');
    await ng('run', 'test-project-two:app-shell');
    await expectFileToMatch('dist/test-project-two/browser/index.html', 'app-shell works!');
  } else {
    await ng('build', 'test-project-two');
    await expectFileToMatch('dist/test-project-two/index.html', 'app-shell works!');
  }
}
