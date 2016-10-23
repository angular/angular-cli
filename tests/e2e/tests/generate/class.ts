import {join} from 'path';
import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';


export default function() {
  const classDir = join('src', 'app');

  return ng('generate', 'class', 'test-class', '--spec')
    .then(() => expectFileToExist(classDir))
    .then(() => expectFileToExist(join(classDir, 'test-class.ts')))
    .then(() => expectFileToExist(join(classDir, 'test-class.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
