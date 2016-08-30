import {join} from 'path';
import {npm} from './utils';

export default function () {
  // Setup to use the local angular-cli copy.
  process.chdir(join(__dirname, '..'));
  return npm('link');
}
