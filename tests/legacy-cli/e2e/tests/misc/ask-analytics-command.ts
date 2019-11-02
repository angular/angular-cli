import { execWithEnv, killAllProcesses, waitForAnyProcessOutputToMatch } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function() {
  try {
    // Execute a command with TTY force enabled
    const execution = execWithEnv('ng', ['version'], {
      ...process.env,
      NG_FORCE_TTY: '1',
      NG_CLI_ANALYTICS: 'ci',
    });

    // Check if the prompt is shown
    await waitForAnyProcessOutputToMatch(/Would you like to share anonymous usage data/);
  } finally {
    killAllProcesses();
  }

  try {
    // Execute a command with TTY force enabled
    const execution = execWithEnv('ng', ['version'], {
      ...process.env,
      NG_FORCE_TTY: '1',
      NG_CLI_ANALYTICS: 'false',
    });

    // Check if the prompt is shown
    await expectToFail(() =>
      waitForAnyProcessOutputToMatch(/Would you like to share anonymous usage data/, 5),
    );
  } finally {
    killAllProcesses();
  }

  // Should not show a prompt when using update
  try {
    // Execute a command with TTY force enabled
    const execution = execWithEnv('ng', ['update'], {
      ...process.env,
      NG_FORCE_TTY: '1',
      NG_CLI_ANALYTICS: 'ci',
    });

    // Check if the prompt is shown
    await expectToFail(() =>
      waitForAnyProcessOutputToMatch(/Would you like to share anonymous usage data/, 5),
    );
  } finally {
    killAllProcesses();
  }
}
