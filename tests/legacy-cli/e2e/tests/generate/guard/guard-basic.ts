import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToExist, expectFileToMatch } from '../../../utils/fs';

export default async function () {
  // Does not create a sub directory.
  const guardDir = join('src', 'app');

  await ng('generate', 'guard', 'test');
  await expectFileToExist(guardDir);
  await expectFileToExist(join(guardDir, 'test-guard.ts'));
  await expectFileToMatch(join(guardDir, 'test-guard.ts'), /export const testGuard: CanActivateFn/);
  await expectFileToExist(join(guardDir, 'test-guard.spec.ts'));
  await ng('test', '--watch=false');
}
