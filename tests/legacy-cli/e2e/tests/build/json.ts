import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';
import {getGlobalVariable} from '../../utils/env';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  return ng('build', '--stats-json')
    .then(() => expectFileToExist('./dist/test-project/stats.json'))
    .then(() => expectGitToBeClean());
}
