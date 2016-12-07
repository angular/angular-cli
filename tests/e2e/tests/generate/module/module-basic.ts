import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist, expectFileToMatch} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function() {
  const moduleDir = join('src', 'app', 'test-module');

  return ng('generate', 'module', 'test-module')
    .then(() => expectFileToExist(moduleDir))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.module.ts')))
    .then(() => expectToFail(() => expectFileToExist(join(moduleDir, 'test-module-routing.module.ts'))))
    .then(() => expectToFail(() => expectFileToExist(join(moduleDir, 'test-module.component.ts'))))
    .then(() => expectToFail(() => expectFileToExist(join(moduleDir, 'test-module.spec.ts'))))
    .then(() => expectFileToMatch(join(moduleDir, 'test-module.module.ts'), 'TestModuleModule'))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
