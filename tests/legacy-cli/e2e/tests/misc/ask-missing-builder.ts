import { execWithEnv, killAllProcesses, waitForAnyProcessOutputToMatch } from '../../utils/process';

export default async function () {
  try {
    // Execute a command with TTY force enabled
    execWithEnv('ng', ['deploy'], {
      ...process.env,
      NG_FORCE_TTY: '1',
      NG_CLI_ANALYTICS: 'false',
    });

    // Check if the prompt is shown
    await waitForAnyProcessOutputToMatch(
      /Would you like to add a package with "deploy" capabilities/,
    );

    killAllProcesses();

    // Execute a command with TTY force enabled
    execWithEnv('ng', ['lint'], {
      ...process.env,
      NG_FORCE_TTY: '1',
      NG_CLI_ANALYTICS: 'false',
    });

    // Check if the prompt is shown
    await waitForAnyProcessOutputToMatch(/Would you like to add ESLint now/);
  } finally {
    killAllProcesses();
  }
}
