import assert from 'node:assert';
import { getGlobalVariable } from '../utils/env';
import { getActivePackageManager } from '../utils/packages';
import { globalNpm } from '../utils/process';

export default async function () {
  const argv = getGlobalVariable('argv');
  if (argv.noglobal) {
    return;
  }

  const testRegistry = getGlobalVariable('package-registry');
  const packageManager = getActivePackageManager();

  const version = require('../package-manager/package.json')['dependencies'][packageManager];
  assert(
    version,
    `Package manager '${packageManager}' version not found in '../package-manager/package.json'.`,
  );

  // Install global Angular CLI being tested, npm+yarn used by e2e tests.
  await globalNpm([
    'install',
    '--global',
    `--registry=${testRegistry}`,
    '@angular/cli',
    `${packageManager}@${version}`,
  ]);
}
