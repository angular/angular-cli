import {join} from 'path';

import {npm, exec} from '../utils/process';


export default function (argv: any) {
  // Setup to use the local angular-cli copy.
  process.chdir(join(__dirname, '../..'));

  return Promise.resolve()
    .then(() => argv.nolink || npm('link'))
    .then(() => exec(process.platform.startsWith('win') ? 'where' : 'which', 'ng'));
}
