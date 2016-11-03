import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist, createDir} from '../../../utils/fs';


export default function() {
  const rootDir = join('src', 'app', 'Upper-Dir');
  createDir(rootDir);
  const componentDir = join(rootDir, 'test-component');
  const componentTwoDir = join(rootDir, 'test-component-two');

  return ng('generate', 'component', 'Upper-Dir/test-component')
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))
    .then(() => ng('generate', 'component', 'Upper-Dir/Test-Component-Two'))
    .then(() => expectFileToExist(join(componentTwoDir, 'test-component-two.component.ts')))
    .then(() => expectFileToExist(join(componentTwoDir, 'test-component-two.component.spec.ts')))
    .then(() => expectFileToExist(join(componentTwoDir, 'test-component-two.component.html')))
    .then(() => expectFileToExist(join(componentTwoDir, 'test-component-two.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
