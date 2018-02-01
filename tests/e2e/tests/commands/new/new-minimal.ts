import {ng} from '../../../utils/process';
import {createProject} from '../../../utils/project';
import {expectFileNotToExist, expectFileToMatch} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function() {
  return Promise.resolve()
    .then(() => createProject('minimal-project', '--minimal'))
    .then(() => expectFileNotToExist('.editorconfig'))
    .then(() => expectFileNotToExist('README.md'))
    .then(() => expectFileNotToExist('karma.conf.js'))
    .then(() => expectFileNotToExist('protractor.conf.js'))
    .then(() => expectFileNotToExist('src/test.ts'))
    .then(() => expectFileNotToExist('src/tsconfig.spec.json'))
    .then(() => expectFileNotToExist('tslint.json'))
    .then(() => expectFileNotToExist('src/app/app.component.html'))
    .then(() => expectFileNotToExist('src/app/app.component.css'))
    .then(() => expectFileNotToExist('src/app/app.component.spec.ts'))
    .then(() => expectFileNotToExist('src/app/favicon.ico'))

    .then(() => expectToFail(() => expectFileToMatch('package.json', '"protractor":')))
    .then(() => expectToFail(() => expectFileToMatch('package.json', '"karma":')))
    .then(() => expectToFail(() => expectFileToMatch('package.json', '"jasmine-core":')))

    // Try to run a build.
    .then(() => ng('build'));
}
