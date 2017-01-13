import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  const functionDir = join('src', 'app');

  return ng('generate', 'function', 'test-function')
    .then(() => expectFileToExist(functionDir))
    .then(() => expectFileToExist(join(functionDir, 'test-function.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
