import {join} from 'path';
import {ng} from '../../../utils/process';
import {createDir, expectFileToExist} from '../../../utils/fs';


export default function() {
  const subDir = 'sub-dir';
  const componentDir = join('src', 'app', subDir, 'test-component');

  return Promise.resolve()
    .then(() => process.chdir('src'))
    .then(() => process.chdir('app'))
    .then(() => createDir(subDir))
    .then(() => process.chdir(subDir))
    .then(() => ng('generate', 'component', 'test-component'))
    .then(() => process.chdir('../../..'))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
