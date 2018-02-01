import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  const upperDirs = join('non', 'existing', 'dir');
  const rootDir = join('src', 'app', upperDirs);

  const componentDir = join(rootDir, 'test-component');
  const componentTwoDir = join(rootDir, 'test-component-two');

  return ng('generate', 'component', `${upperDirs}/test-component`)
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))
    .then(() => ng('generate', 'component', `${upperDirs}/Test-Component-Two`))
    .then(() => expectFileToExist(join(componentTwoDir, 'test-component-two.component.ts')))
    .then(() => expectFileToExist(join(componentTwoDir, 'test-component-two.component.spec.ts')))
    .then(() => expectFileToExist(join(componentTwoDir, 'test-component-two.component.html')))
    .then(() => expectFileToExist(join(componentTwoDir, 'test-component-two.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
