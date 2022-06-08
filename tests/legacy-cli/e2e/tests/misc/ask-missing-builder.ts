import { execAndWaitForOutputToMatch, killAllProcesses } from '../../utils/process';

export default async function () {
  // Execute a command with TTY force enabled and check that the prompt is shown.
  await execAndWaitForOutputToMatch(
    'ng',
    ['deploy'],
    /Would you like to add a package with "deploy" capabilities/,
    {
      ...process.env,
      NG_FORCE_TTY: '1',
      NG_CLI_ANALYTICS: 'false',
    },
  );

  await killAllProcesses();

  // Execute a command with TTY force enabled and check that the prompt is shown.
  await execAndWaitForOutputToMatch('ng', ['lint'], /Would you like to add ESLint now/, {
    ...process.env,
    NG_FORCE_TTY: '1',
    NG_CLI_ANALYTICS: 'false',
  });
}
