import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('build')
    .then(() => expectFileToExist('dist/test-project/vendor-es5.js'))
    .then(() => expectFileToExist('dist/test-project/vendor-es2015.js'))
    .then(() => ng('build', '--vendor-chunk=false'))
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/vendor-es5.js')))
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/vendor-es2015.js')));
}
