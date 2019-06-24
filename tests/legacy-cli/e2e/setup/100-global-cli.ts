import { getGlobalVariable } from '../utils/env';
import { exec, silentNpm } from '../utils/process';

const packages = require('../../../../lib/packages').packages;

export default async function() {
  const argv = getGlobalVariable('argv');
  if (argv.noglobal) {
    return;
  }

  // Install global Angular CLI.
  // --unsafe-perm is needed for circleci
  // because of https://github.com/sass/node-sass/issues/2006
  await silentNpm('install', '-g', packages['@angular/cli'].tar, '--unsafe-perm');

  try {
    await exec(process.platform.startsWith('win') ? 'where' : 'which', 'ng');
  } catch {}
}
