import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function() {
  const moduleDir = join('src', 'app', 'test');

  return ng('generate', 'module', 'test', '--routing')
    .then(() => expectFileToExist(moduleDir))
    .then(() => expectFileToExist(join(moduleDir, 'test.module.ts')))
    .then(() => expectFileToExist(join(moduleDir, 'test-routing.module.ts')))
    .then(() => expectToFail(() => expectFileToExist(join(moduleDir, 'test.spec.ts'))))
    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
