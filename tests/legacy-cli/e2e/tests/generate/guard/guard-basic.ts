import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist, expectFileToMatch} from '../../../utils/fs';


export default async function() {
  // Does not create a sub directory.
  const guardDir = join('src', 'app');

  await ng('generate', 'guard', 'test-guard');
  await expectFileToExist(guardDir);
  await expectFileToExist(join(guardDir, 'test-guard.guard.ts'));
  await expectFileToMatch(join(guardDir, 'test-guard.guard.ts'), /implements CanActivate/);
  await expectFileToExist(join(guardDir, 'test-guard.guard.spec.ts'));
  await ng('test', '--watch=false');
}
