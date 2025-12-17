import { getGlobalVariable } from '../../../utils/env';
import { expectFileToMatch } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

const snapshots = require('../../../ng-snapshot/package.json');

export default async function () {
  await ng('generate', 'app', 'test-project-two', '--routing', '--no-standalone', '--skip-install');
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

  await ng('build', 'test-project-two');
  await expectFileToMatch('dist/test-project-two/browser/index.html', 'app-shell works!');
}
