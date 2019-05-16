import * as path from 'path';
import { getGlobalVariable } from '../../utils/env';
import { exec, execAndWaitForOutputToMatch, silentNpm } from '../../utils/process';

const packages = require('../../../../../lib/packages').packages;

export default async function () {
  // setup
  const argv = getGlobalVariable('argv');
  if (argv.noglobal) {
    return;
  }

  const startCwd = process.cwd();
  await silentNpm('install', '-g', packages['@angular-devkit/schematics-cli'].tar, '--unsafe-perm');
  await exec(process.platform.startsWith('win') ? 'where' : 'which', 'schematics');

  // create blank schematic
  await exec('schematics', 'schematic', '--name', 'test-schematic');

  process.chdir(path.join(startCwd, 'test-schematic'));
  await execAndWaitForOutputToMatch(
    'schematics',
    ['.:', '--list-schematics'],
    /my-full-schematic/,
  );

  // restore path
  process.chdir(startCwd);

}
