import { getGlobalVariable } from '../utils/env';
import { getActivePackageManager } from '../utils/packages';
import { globalNpm } from '../utils/process';

const PACKAGE_MANAGER_VERSION = {
  'npm': '10.8.1',
  'yarn': '1.22.22',
  'pnpm': '9.3.0',
  'bun': '1.1.13',
};

export default async function () {
  const argv = getGlobalVariable('argv');
  if (argv.noglobal) {
    return;
  }

  const testRegistry = getGlobalVariable('package-registry');
  const packageManager = getActivePackageManager();

  // Install global Angular CLI being tested, npm+yarn used by e2e tests.
  await globalNpm([
    'install',
    '--global',
    `--registry=${testRegistry}`,
    '@angular/cli',
    `${packageManager}@${PACKAGE_MANAGER_VERSION[packageManager]}`,
  ]);
}
