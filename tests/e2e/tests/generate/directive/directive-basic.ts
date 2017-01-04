import {ng} from '../../../utils/process';
import {join} from 'path';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  const directiveDir = join('src', 'app');
  return ng('generate', 'directive', 'directive-test')
    .then(() => expectFileToExist(join(directiveDir, 'directive-test.directive.ts')))
    .then(() => expectFileToExist(join(directiveDir, 'directive-test.directive.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
