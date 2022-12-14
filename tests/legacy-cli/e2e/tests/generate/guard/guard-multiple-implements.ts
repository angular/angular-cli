import { join } from 'path';
import { ng } from '../../../utils/process';
import { expectFileToExist, expectFileToMatch } from '../../../utils/fs';

export default async function () {
  // Does not create a sub directory.
  const guardDir = join('src', 'app');

  await ng(
    'generate',
    'guard',
    'multiple',
    '--implements=CanActivate',
    '--implements=CanDeactivate',
  );
  await expectFileToExist(guardDir);
  await expectFileToExist(join(guardDir, 'multiple.guard.ts'));
  await expectFileToMatch(
    join(guardDir, 'multiple.guard.ts'),
    /implements CanActivate, CanDeactivate<unknown>/,
  );
  await expectFileToExist(join(guardDir, 'multiple.guard.spec.ts'));
  await ng('test', '--watch=false');
}
