import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';


export default function() {
  return Promise.resolve()
    .then(() => createProject('routing-project', '--routing'))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
