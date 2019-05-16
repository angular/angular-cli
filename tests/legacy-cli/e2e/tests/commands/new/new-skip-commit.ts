import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';
import {expectToFail} from '../../../utils/utils';
import {expectGitToBeClean} from '../../../utils/git';


export default function() {
  return Promise.resolve()
    .then(() => createProject('new-project', '--skip-commit'))
    .then(() => expectToFail(() => expectGitToBeClean()))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
