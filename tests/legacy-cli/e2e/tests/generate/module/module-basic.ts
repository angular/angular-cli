import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist, expectFileToMatch} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function() {
  const moduleDir = join('src', 'app', 'test');

  return ng('generate', 'module', 'test')
    .then(() => expectFileToExist(moduleDir))
    .then(() => expectFileToExist(join(moduleDir, 'test.module.ts')))
    .then(() => expectToFail(() => expectFileToExist(join(moduleDir, 'test-routing.module.ts'))))
    .then(() => expectToFail(() => expectFileToExist(join(moduleDir, 'test.spec.ts'))))
    .then(() => expectFileToMatch(join(moduleDir, 'test.module.ts'), 'TestModule'))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
