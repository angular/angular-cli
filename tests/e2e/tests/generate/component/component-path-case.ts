import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist, createDir} from '../../../utils/fs';


export default function() {
  const rootDir = join('src', 'app', 'Upper-Dir');
  createDir(rootDir);
  const componentDir = join(rootDir, 'component-test');
  const componentTwoDir = join(rootDir, 'component-test-two');

  return ng('generate', 'component', 'Upper-Dir/component-test')
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'component-test.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'component-test.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'component-test.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'component-test.component.css')))
    .then(() => ng('generate', 'component', 'Upper-Dir/Component-Test-Two'))
    .then(() => expectFileToExist(join(componentTwoDir, 'component-test-two.component.ts')))
    .then(() => expectFileToExist(join(componentTwoDir, 'component-test-two.component.spec.ts')))
    .then(() => expectFileToExist(join(componentTwoDir, 'component-test-two.component.html')))
    .then(() => expectFileToExist(join(componentTwoDir, 'component-test-two.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
