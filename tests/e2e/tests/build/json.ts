import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';
import {getGlobalVariable} from '../../utils/env';


export default function() {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  return ng('build', '--stats-json')
    .then(() => expectFileToExist('./dist/stats.json'))
    .then(() => expectGitToBeClean());
}
