import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist,expectFileToMatch} from '../../../utils/fs';


export default async function() {
  // Does not create a sub directory.
  const guardDir = join('src', 'app');

  await ng('generate', 'guard', 'load', '--implements=CanLoad');
  await expectFileToExist(guardDir);
  await expectFileToExist(join(guardDir, 'load.guard.ts'));
  await expectFileToMatch(join(guardDir, 'load.guard.ts'), /implements CanLoad/);
  await expectFileToExist(join(guardDir, 'load.guard.spec.ts'));
  await ng('test', '--watch=false');
}
