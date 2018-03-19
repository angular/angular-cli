import { ng } from '../../utils/process';
import { moveFile } from '../../utils/fs';

// tslint:disable:max-line-length
export default function () {
  // make sure both --watch=false work
  return ng('test', '--watch=false')
    .then(() => moveFile('./projects/test-project/karma.conf.js',
      './projects/test-project/karma.conf.bis.js'))
    .then(() => ng('test', '--watch=false', '--karmaConfig=projects/test-project/karma.conf.bis.js'));
}
