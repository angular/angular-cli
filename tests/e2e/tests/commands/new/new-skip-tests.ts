import {createProject} from '../../../utils/project';
import {expectFileNotToExist} from '../../../utils/fs';
import {getGlobalVariable} from '../../../utils/env';


export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => createProject('new-project-skip-tests', '--skip-tests'))
    .then(() => expectFileNotToExist('src/app/app.component.spec.ts'));
}
