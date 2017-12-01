import {createProject} from '../../../utils/project';
import {expectFileNotToExist} from '../../../utils/fs';


export default function() {
  return Promise.resolve()
    .then(() => createProject('new-project-skip-tests', '--skip-tests'))
    .then(() => expectFileNotToExist('src/app/app.component.spec.ts'));
}
