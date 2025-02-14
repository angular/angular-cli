import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToExist, expectFileToMatch } from '../../../utils/fs';
import { expectToFail } from '../../../utils/utils';
import { useCIChrome, useCIDefaults } from '../../../utils/project';

export default async function () {
  const projectName = 'test-project-two';
  const moduleDir = `projects/${projectName}/src/app/test`;
  await ng('generate', 'application', projectName, '--no-standalone', '--skip-install');
  await useCIDefaults(projectName);
  await useCIChrome(projectName, 'projects/test-project-two');

  await ng('generate', 'module', 'test', '--project', projectName);
  await expectFileToExist(moduleDir);
  await expectFileToExist(join(moduleDir, 'test.module.ts'));
  await expectToFail(() => expectFileToExist(join(moduleDir, 'test-routing.module.ts')));
  await expectToFail(() => expectFileToExist(join(moduleDir, 'test.spec.ts')));
  await expectFileToMatch(join(moduleDir, 'test.module.ts'), 'TestModule');

  // Try to run the unit tests.
  await ng('test', projectName, '--watch=false');
}
