import {silentNpm, exec} from '../utils/process';
import {getGlobalVariable} from '../utils/env';

const packages = require('../../../lib/packages').packages;


export default function () {
  return Promise.resolve()
    .then(() => {
      const argv = getGlobalVariable('argv');
      if (argv.noglobal) {
        return;
      }

      // Install global Angular CLI.
      // --unsafe-perm is needed for circleci
      // because of https://github.com/sass/node-sass/issues/2006
      return silentNpm('install', '-g', packages['@angular/cli'].tar, '--unsafe-perm');
    })
    .then(() => exec(process.platform.startsWith('win') ? 'where' : 'which', 'ng'));
}
