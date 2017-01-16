import {join} from 'path';
import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';


export default function() {
  const classDir = join('src', 'app');

  return ng('generate', 'class', 'class-test', '--spec')
    .then(() => expectFileToExist(classDir))
    .then(() => expectFileToExist(join(classDir, 'class-test.ts')))
    .then(() => expectFileToExist(join(classDir, 'class-test.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
