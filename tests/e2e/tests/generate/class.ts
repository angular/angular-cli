import {join} from 'path';
import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';


export default function() {
  // Create the pipe in the same directory.
  const pipeDir = join('src', 'app');

  return ng('generate', 'class', 'test-class')
    .then(() => expectFileToExist(pipeDir))
    .then(() => expectFileToExist(join(pipeDir, 'test-class.ts')))
    .then(() => expectFileToExist(join(pipeDir, 'test-class.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
