import { ng } from '../../utils/process';
import { moveFile } from '../../utils/fs';

export default function () {
  // make sure both --watch=false and --single-run work
  return ng('test', '--single-run')
    .then(() => ng('test', '--watch=false'))
    .then(() => moveFile('./karma.conf.js', './karma.conf.bis.js'))
    .then(() => ng('test', '--single-run', '--config', 'karma.conf.bis.js'));
}
