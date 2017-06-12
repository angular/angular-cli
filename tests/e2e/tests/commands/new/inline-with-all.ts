// tslint:disable:max-line-length
import { createProject } from '../../../utils/project';
import { ng } from '../../../utils/process';
import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { join } from 'path';

export default () => {
  const componentDir = join('src', 'app', 'test-component');
  const componentFile = (file: string) => join(componentDir, file);

  return Promise.resolve()
    .then(() => createProject('test-inline-with-all', '--inline-template-all', '--inline-style-all'))
    .then(() => expectFileNotToExist('src/app/app.component.html'))
    .then(() => expectFileNotToExist('src/app/app.component.css'))
    .then(() => ng('generate', 'component', 'test-component'))

    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(componentFile('test-component.component.ts')))
    .then(() => expectFileToExist(componentFile('test-component.component.spec.ts')))
    .then(() => expectFileNotToExist(componentFile('test-component.component.html')))
    .then(() => expectFileNotToExist(componentFile('test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
};
