import * as fs from 'fs';
import { prerelease } from 'semver';
import { packages } from '../../../../lib/packages';
import { npm } from '../utils/process';

export default async function() {
  const pre = prerelease(packages['@angular/cli'].version);

  fs.writeFileSync('.npmrc', 'registry = http://localhost:4873', 'utf8');

  try {
    const publishArgs = ['run', 'admin', '--', 'publish', '--versionCheck', 'false'];
    if (pre && pre.length > 0) {
      publishArgs.push('--tag');
      publishArgs.push('next');
    }
    await npm(...publishArgs);
  } finally {
    fs.unlinkSync('.npmrc');
  }
}
