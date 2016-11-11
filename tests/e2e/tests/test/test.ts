import {ng} from '../../utils/process';
import * as path from 'path';


export default function() {
  // make sure both --watch=false and --single-run work
  const karmaConfigPath = path.join(process.cwd(), './karma.conf.js');

  return ng('test', '--single-run')
    .then(() => ng('test', '--watch=false'))
    .then(() => ng('test', '--watch=false', `--config=${karmaConfigPath}`));
}
