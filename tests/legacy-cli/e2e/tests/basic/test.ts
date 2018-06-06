import { ng } from '../../utils/process';
import { moveFile } from '../../utils/fs';

// tslint:disable:max-line-length
export default function () {
  // make sure both --watch=false work
  return ng('test', '--watch=false')
    .then(() => moveFile('./src/karma.conf.js',
      './src/karma.conf.bis.js'))
    .then(() => ng('test', '--watch=false', '--karmaConfig=src/karma.conf.bis.js'));
}
