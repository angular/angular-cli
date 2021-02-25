import { prerelease } from 'semver';
import { packages } from '../../../../lib/packages';
import { getGlobalVariable } from '../utils/env';
import { npm } from '../utils/process';

export default async function() {
  const testRegistry = getGlobalVariable('package-registry');
  const publishArgs = [
    'run',
    'admin',
    '--',
    'publish',
    '--no-versionCheck',
    '--no-branchCheck',
    `--registry=${testRegistry}`,
  ];

  const pre = prerelease(packages['@angular/cli'].version);
  if (pre && pre.length > 0) {
    publishArgs.push('--tag', 'next');
  } else {
    publishArgs.push('--tag', 'latest');
  }

  await npm(...publishArgs);
}
