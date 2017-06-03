// tslint:disable:max-line-length
import { createProject } from '../../../utils/project';
import { ng } from '../../../utils/process';
import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { join } from 'path';

export default () => {
  const componentDir = join('src', 'app', 'test-component');

  return Promise.resolve()
    .then(() => createProject('test-project-inline-style-and-template', '--inline-template', '--inline-style'))
    .then(() => expectFileNotToExist('src/app/app.component.html'))
    .then(() => expectFileNotToExist('src/app/app.component.css'))
    .then(() => ng('generate', 'component', 'test-component'))
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    // template and style files should not exist
    .then(() => expectFileNotToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileNotToExist(join(componentDir, 'test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
};
