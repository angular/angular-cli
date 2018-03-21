import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  // Does not create a sub directory.
  const guardDir = join('projects', 'test-project', 'src', 'app');

  return ng('generate', 'guard', 'test-guard')
    .then(() => expectFileToExist(guardDir))
    .then(() => expectFileToExist(join(guardDir, 'test-guard.guard.ts')))
    .then(() => expectFileToExist(join(guardDir, 'test-guard.guard.spec.ts')));


    // Try to run the unit tests.
    // TODO: Enable once schematic is updated for rxjs 6
    // .then(() => ng('test', '--watch=false'));
}
