import { ng } from '../../utils/process';
import { moveFile } from '../../utils/fs';

// tslint:disable:max-line-length
export default function () {
  // make sure both --watch=false work
  return ng('test', '--watch=false')
    .then(() => moveFile('./karma.conf.js', './karma.conf.bis.js'))
    .then(() => ng('test', '--watch=false', '--karmaConfig=karma.conf.bis.js'));
}
