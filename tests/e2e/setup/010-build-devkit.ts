import {join} from 'path';
import {getGlobalVariable} from '../utils/env';
import { exec, npm } from '../utils/process';
import {updateJsonFile} from '../utils/project';

const packages = require('../../../lib/packages').packages;

export default function() {
  const argv = getGlobalVariable('argv');

  if (argv.nobuild) {
    return;
  }
  if (!argv.devkit) {
    return;
  }

  return exec(`${argv.devkit}/bin/devkit-admin`, 'build', '--local');
}
