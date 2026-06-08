import { appendFile } from 'node:fs/promises';
import { getGlobalVariable } from '../../utils/env';
import { getActivePackageManager, installWorkspacePackages } from '../../utils/packages';
import { ng } from '../../utils/process';
import { isPrereleaseCli, updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  const isPrerelease = await isPrereleaseCli();
  let tag = isPrerelease ? '@next' : '';
  if (getActivePackageManager() === 'npm') {
    await appendFile('.npmrc', '\nlegacy-peer-deps=true');
  }

  await ng('add', `@angular/material${tag}`, '--skip-confirmation');

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  if (isSnapshotBuild) {
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      // Angular material adds dependencies on other Angular packages
      // Iterate over all of the packages to update them to the snapshot version.
      for (const [name, version] of Object.entries(snapshots.dependencies)) {
        if (name in dependencies) {
          dependencies[name] = version;
        }
      }
    });
    await installWorkspacePackages();
  }

  const args: string[] = [
    'generate',
    '@angular/material:theme-color',
    '--primary-color=#0641e6',
    '--tertiary-color=#994aff',
    '--neutral-color=#313138',
    '--error-color=#eb5757',
    '--secondary-color=#009096',
    '--neutral-variant-color=#b2b2b8',
  ];

  await ng(...args);

  // Should fail as file exists
  await expectToFail(() => ng(...args));

  await ng(...args, '--force');
}
