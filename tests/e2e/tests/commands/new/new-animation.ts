import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';


export default function() {
  return Promise.resolve()
    .then(() => createProject('animation-project', '--animation'))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
