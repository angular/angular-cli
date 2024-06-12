import { getGlobalVariable } from '../utils/env';
import { globalNpm } from '../utils/process';

const NPM_VERSION = '7.24.0'; // TODO: update to latest and fix tests.
const YARN_VERSION = '1.22.22';
const PNPM_VERSION = '9.3.0';
const BUN_VERSION = '1.1.13';

export default async function () {
  const argv = getGlobalVariable('argv');
  if (argv.noglobal) {
    return;
  }

  const testRegistry = getGlobalVariable('package-registry');

  // Install global Angular CLI being tested, npm+yarn used by e2e tests.
  await globalNpm([
    'install',
    '--global',
    `--registry=${testRegistry}`,
    '@angular/cli',
    `bun@${BUN_VERSION}`,
    `npm@${NPM_VERSION}`,
    `yarn@${YARN_VERSION}`,
    `pnpm@${PNPM_VERSION}`,
  ]);
}
