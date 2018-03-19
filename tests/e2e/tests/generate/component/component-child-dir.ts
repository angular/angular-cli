import {join} from 'path';
import {ng} from '../../../utils/process';
import {createDir, expectFileToExist} from '../../../utils/fs';


export default function() {
  const subDir = 'sub-dir';
  const componentDir = join('projects', 'test-project', 'src', 'app', subDir, 'test-component');

  return Promise.resolve()
    .then(() => process.chdir('projects'))
    .then(() => process.chdir('test-project'))
    .then(() => process.chdir('src'))
    .then(() => process.chdir('app'))
    .then(() => createDir(subDir))
    .then(() => process.chdir(subDir))
    .then(() => console.log('curent dir: ' + process.cwd()))
    .then(() => ng('generate', 'component', 'test-component'))
    .then(() => process.chdir('../../../../..'))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
