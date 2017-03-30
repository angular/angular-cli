import {createProject} from '../../../utils/project';
import {expectFileNotToExist} from '../../../utils/fs';


export default function() {
  return Promise.resolve()
    .then(() => createProject('new-project-skip-e2e', '--skip-e2e'))
    .then(() => expectFileNotToExist('e2e/app.e2e-spec.ts'))
    .then(() => expectFileNotToExist('e2e/app.po.ts'))
    .then(() => expectFileNotToExist('protractor.conf.js'));
}
