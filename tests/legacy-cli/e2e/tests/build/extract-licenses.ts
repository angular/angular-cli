import {join} from 'path';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';
import {ng} from '../../utils/process';

export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('build', '--prod', '--extract-licenses=false')
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/3rdpartylicenses.txt')));
}
