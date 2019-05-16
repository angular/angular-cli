import {writeFile, expectFileToExist, expectFileToMatch} from '../../utils/fs';
import {ng} from '../../utils/process';
import {expectToFail} from '../../utils/utils';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return writeFile('src/assets/.file', '')
    .then(() => writeFile('src/assets/test.abc', 'hello world'))
    .then(() => ng('build'))
    .then(() => expectFileToExist('dist/test-project/favicon.ico'))
    .then(() => expectFileToExist('dist/test-project/assets/.file'))
    .then(() => expectFileToMatch('dist/test-project/assets/test.abc', 'hello world'))
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/assets/.gitkeep')));
}
