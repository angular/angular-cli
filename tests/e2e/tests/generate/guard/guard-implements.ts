import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToExist, expectFileToMatch } from '../../../utils/fs';

export default async function () {
  // Does not create a sub directory.
  const guardDir = join('src', 'app');

  await ng('generate', 'guard', 'match', '--implements=CanMatch');
  await expectFileToExist(guardDir);
  await expectFileToExist(join(guardDir, 'match-guard.ts'));
  await expectFileToMatch(join(guardDir, 'match-guard.ts'), /export const matchGuard: CanMatch/);
  await expectFileToExist(join(guardDir, 'match-guard.spec.ts'));
  await ng('test', '--watch=false');
}
