import {join} from 'path';
import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';


export default function() {
  // Create the pipe in the same directory.
  const classDir = join('src', 'app');

  return ng('generate', 'class', 'test-class')
    .then(() => expectFileToExist(classDir))
    .then(() => expectFileToExist(join(classDir, 'test-class.ts')))
    .then(() => expectFileToExist(join(classDir, 'test-class.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
