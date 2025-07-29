import { join } from 'node:path';
import { expectFileNotToExist, expectFileToExist, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import assert from 'node:assert';

export default async function () {
  assert(process.env.HOME, 'Expected HOME directory to be set.');

  const extensionDir = join(process.env.HOME, '.gemini', 'extensions', 'angular');
  const geminiBestPracticesFile = join(extensionDir, 'GEMINI.md');

  await expectFileNotToExist(extensionDir);
  await expectFileNotToExist(geminiBestPracticesFile);
  await ng('ai', 'setup-gemini-cli');

  await expectFileToExist(extensionDir);
  await expectFileToExist(geminiBestPracticesFile);
  await expectFileToMatch(geminiBestPracticesFile, 'Angular Best Practices');
}
