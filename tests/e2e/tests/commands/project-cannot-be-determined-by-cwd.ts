import assert from 'node:assert/strict';
import { join } from 'node:path';
import { execAndCaptureError, execAndWaitForOutputToMatch, ng } from '../../utils/process';
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
    assert.match(message, new RegExp(errorMessage));

    // Schematics that require a project should explain how to select one
    const { message: generateMessage } = await expectToFail(() =>
      ng('generate', 'component', 'foo'),
    );
    assert.match(generateMessage, /Use the "--project" option to specify a project/);
    assert.match(generateMessage, /Available projects are:\n- second-app\n- third-app/);

    // The project is checked before prompting for other options
    const { message: interactiveMessage } = await execAndCaptureError(
      'ng',
      ['generate', 'component'],
      {
        ...process.env,
        NG_FORCE_TTY: '1',
        NG_CLI_ANALYTICS: 'false',
        NG_FORCE_AUTOCOMPLETE: 'false',
      },
      'foo\n',
    );
    assert.match(interactiveMessage, /Use the "--project" option to specify a project/);
    assert.doesNotMatch(interactiveMessage, /What name would you like to use for the component/);

    // Help should still work
    await execAndWaitForOutputToMatch('ng', ['build', '--help'], /--configuration/);

    // Yargs allows positional args to be passed as flags. Verify that in this case the project can be determined.
    await ng('build', '--project=third-app', '--configuration=development');

    process.chdir(join(startCwd, 'projects/second-app'));
    await ng('build', '--configuration=development');
    await ng('generate', 'component', 'foo', '--dry-run');
  } finally {
    // Restore path
    process.chdir(startCwd);
  }

  // A project from the workspace schematic options is used and other validation errors are kept
  await updateJsonFile('angular.json', (workspaceJson) => {
    workspaceJson.schematics ??= {};
    workspaceJson.schematics['@schematics/angular:component'] = { project: 'second-app' };
  });
  const { message: selectorMessage } = await expectToFail(() =>
    ng('generate', 'component', 'foo', '--selector=1foo'),
  );
  assert.match(selectorMessage, /must match format "html-selector"/);
  assert.doesNotMatch(selectorMessage, /Cannot determine project/);
  await ng('generate', 'component', 'foo', '--dry-run');
}
