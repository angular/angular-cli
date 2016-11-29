import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist, createDir} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function() {
  const moduleDir = join('src', 'app', 'test-module');


  return Promise.resolve()
    .then(() => createDir('src/app/fldr'))
    .then(() => process.chdir('./src/app/fldr'))
    .then(() => process.env.PWD = process.cwd())
    .then(() => ng('generate', 'module', '../test-module'))
    .then(() => process.chdir('../../..')) // Reset directory after generation for verification
    .then(() => process.env.PWD = process.cwd())
    .then(() => expectFileToExist(moduleDir))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.module.ts')))
    .then(() => expectToFail(() => expectFileToExist(join(moduleDir, 'test-module.routing.ts'))))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.component.ts')))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.component.spec.ts')))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.component.html')))
    .then(() => expectFileToExist(join(moduleDir, 'test-module.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
