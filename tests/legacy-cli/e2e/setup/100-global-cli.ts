import { getGlobalVariable } from '../utils/env';
import { globalNpm } from '../utils/process';

const NPM_VERSION = '7.24.0';
const YARN_VERSION = '1.22.18';

export default async function () {
  const argv = getGlobalVariable('argv');
  if (argv.noglobal) {
    return;
  }

  const testRegistry: string = getGlobalVariable('package-registry');

  // Install global Angular CLI being tested, npm+yarn used by e2e tests.
  await globalNpm([
    'install',
    '--global',
    `--registry=${testRegistry}`,
    '@angular/cli',
    `npm@${NPM_VERSION}`,
    `yarn@${YARN_VERSION}`,
  ]);
}
