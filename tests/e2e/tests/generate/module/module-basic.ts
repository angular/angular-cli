import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function() {
  const moduleDir = join('src', 'app', 'test-module');

  return ng('generate', 'module', 'test-module')
    .then(() => expectFileToExist(moduleDir))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.module.ts')))
    .then(() => expectToFail(() => expectFileToExist(join(moduleDir, 'test-module.routing.ts'))))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.component.ts')))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.component.spec.ts')))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.component.html')))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
