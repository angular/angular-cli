import {ng} from '../../utils/process';
import {expectToFail} from '../../utils/utils';
import {deleteFile, expectFileToExist} from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';

export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  return ng('build')
    // This is supposed to fail since there's a missing file
    .then(() => deleteFile('src/app/app.component.ts'))
    // The build fails but we don't delete the output of the previous build.
    .then(() => expectToFail(() => ng('build', '--no-delete-output-path')))
    .then(() => expectFileToExist('dist'))
    // By default, output path is always cleared.
    .then(() => expectToFail(() => ng('build')))
    .then(() => expectToFail(() => expectFileToExist('dist')));
}
