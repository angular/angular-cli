import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToExist } from '../../../utils/fs';
import { expectToFail } from '../../../utils/utils';
import { useCIChrome, useCIDefaults } from '../../../utils/project';

export default async function () {
  const projectName = 'test-project-two';
  await ng('generate', 'application', projectName, '--no-standalone', '--skip-install');
  await useCIDefaults(projectName);
  await useCIChrome(projectName, 'projects/test-project-two');

  const testPath = join(process.cwd(), `projects/${projectName}/src/app`);
  process.chdir(testPath);

  await ng('generate', 'module', 'sub-dir/child', '--routing');
  await expectFileToExist(join(testPath, 'sub-dir/child'));
  await expectFileToExist(join(testPath, 'sub-dir/child', 'child.module.ts'));
  await expectFileToExist(join(testPath, 'sub-dir/child', 'child-routing.module.ts'));
  await expectToFail(() => expectFileToExist(join(testPath, 'sub-dir/child', 'child.spec.ts')));

  // Try to run the unit tests.
  await ng('test', projectName, '--watch=false');
}
