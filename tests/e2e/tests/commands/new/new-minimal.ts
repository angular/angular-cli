import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';
import {expectFileNotToExist, expectFileToMatch} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function() {
  // TODO(architect): re-enable after figuring out how a new minimal project looks like.
  return Promise.resolve()
    .then(() => createProject('minimal-project', '--minimal'))
    .then(() => expectFileNotToExist('.editorconfig'))
    .then(() => expectFileNotToExist('README.md'))
    .then(() => expectFileNotToExist('karma.conf.js'))
    .then(() => expectFileNotToExist('protractor.conf.js'))
    .then(() => expectFileNotToExist('projects/test-project/src/test.ts'))
    .then(() => expectFileNotToExist('projects/test-project/src/tsconfig.spec.json'))
    .then(() => expectFileNotToExist('tslint.json'))
    .then(() => expectFileNotToExist('projects/test-project/src/app/app.component.html'))
    .then(() => expectFileNotToExist('projects/test-project/src/app/app.component.css'))
    .then(() => expectFileNotToExist('projects/test-project/src/app/app.component.spec.ts'))
    .then(() => expectFileNotToExist('projects/test-project/src/app/favicon.ico'))

    .then(() => expectToFail(() => expectFileToMatch('package.json', '"protractor":')))
    .then(() => expectToFail(() => expectFileToMatch('package.json', '"karma":')))
    .then(() => expectToFail(() => expectFileToMatch('package.json', '"jasmine-core":')))

    // Try to run a build.
    .then(() => ng('build'));
}
