import {join} from 'path';
import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';


export default function() {
  const projectDir = join('src', 'app');

  return ng('generate', 'class', 'test-class')
    .then(() => expectFileToExist(projectDir))
    .then(() => expectFileToExist(join(projectDir, 'test-class.ts')))
    .then(() => expectFileToExist(join(projectDir, 'test-class.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
