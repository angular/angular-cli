import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  return Promise.resolve()
    .then(() => ng('config', 'defaults.styleExt', 'scss', '--global'))
    .then(() => createProject('style-project'))
    .then(() => expectFileToExist('projects/test-project/src/app/app.component.scss'))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
