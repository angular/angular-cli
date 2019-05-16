import {ng} from '../../utils/process';
import {expectToFail} from '../../utils/utils';
import {deleteFile, expectFileToExist} from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';

export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('build')
    // This is supposed to fail since there's a missing file
    .then(() => deleteFile('src/app/app.component.ts'))
    // The build fails but we don't delete the output of the previous build.
    .then(() => expectToFail(() => ng('build', '--delete-output-path=false')))
    .then(() => expectFileToExist('dist'))
    // By default, output path is always cleared.
    .then(() => expectToFail(() => ng('build')))
    .then(() => expectToFail(() => expectFileToExist('dist/test-project')));
}
