import { join } from 'path';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  const errorMessage =
    'Cannot determine project for command.\n' +
    'This is a multi-project workspace and more than one project supports this command.';

  // Delete root project
  await updateJsonFile('angular.json', (workspaceJson) => {
    delete workspaceJson.projects['test-project'];
  });

  await ng('generate', 'app', 'second-app', '--skip-install');
  await ng('generate', 'app', 'third-app', '--skip-install');

  const startCwd = process.cwd();

  try {
    const { message } = await expectToFail(() => ng('build'));
    if (!message.includes(errorMessage)) {
      throw new Error(`Expected build to fail with: '${errorMessage}'.`);
    }

    // Help should still work
    execAndWaitForOutputToMatch('ng', ['build', '--help'], /--configuration/);

    // Yargs allows positional args to be passed as flags. Verify that in this case the project can be determined.
    await ng('build', '--project=third-app', '--configuration=development');

    process.chdir(join(startCwd, 'projects/second-app'));
    await ng('build', '--configuration=development');
  } finally {
    // Restore path
    process.chdir(startCwd);
  }
}
