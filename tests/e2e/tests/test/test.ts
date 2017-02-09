import { ng } from '../../utils/process';
import { copyFile } from '../../utils/fs';

export default function () {
  // make sure both --watch=false and --single-run work
  return ng('test', '--single-run')
    .then(() => ng('test', '--watch=false'))
    .then(() => copyFile('./karma.conf.js', './karma.conf.bis.js'))
    .then(() => ng('test', '--single-run', '--config-file', 'karma.conf.bis.js'));
}
