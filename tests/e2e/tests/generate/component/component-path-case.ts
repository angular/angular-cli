import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist, createDir} from '../../../utils/fs';


export default function() {
  const rootDir = join('src', 'app', 'upper-dir');
  const componentDir = join(rootDir.toLowerCase(), 'test-component');
  createDir(rootDir);

  return ng('generate', 'component', join('Upper-Dir', 'test-component'))
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
