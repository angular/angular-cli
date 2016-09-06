import {join} from 'path';

import {npm, exec} from '../utils/process';


export default function () {
  // Setup to use the local angular-cli copy.
  process.chdir(join(__dirname, '../..'));
  return npm('link')
    .then(() => exec('which', 'ng'));
}
