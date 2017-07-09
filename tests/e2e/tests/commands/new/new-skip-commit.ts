import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';
import {expectToFail} from '../../../utils/utils';
import {expectGitToBeClean} from '../../../utils/git';
import {getGlobalVariable} from '../../../utils/env';


export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => createProject('new-project', '--skip-commit'))
    .then(() => expectToFail(() => expectGitToBeClean()))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
