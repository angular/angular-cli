import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  const moduleDir = join('src', 'app', 'test-module');

  return ng('generate', 'module', 'test-module', '--routing')
    .then(() => expectFileToExist(moduleDir))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.module.ts')))
    .then(() => expectFileToExist(join(moduleDir, 'test-module-routing.module.ts')))
    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
