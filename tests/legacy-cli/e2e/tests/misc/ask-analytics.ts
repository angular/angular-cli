import { createDir, rimraf } from '../../utils/fs';
import {
  execWithEnv,
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
} from '../../utils/process';

export default async function() {
  // Create a temporary directory to install the CLI
  await createDir('../ask-analytics');
  const cwd = process.cwd();
  process.chdir('../ask-analytics');

  try {
    // Install the CLI with TTY force enabled
    const execution = execWithEnv(
      'npm',
      ['install', '@angular/cli', '--registry=http://localhost:4873'],
      { ...process.env, 'NG_FORCE_TTY': '1' },
    );

    // Check if the prompt is shown
    await waitForAnyProcessOutputToMatch(/Would you like to share anonymous usage data/);

  } finally {
    killAllProcesses();

    // Cleanup
    process.chdir(cwd);
    await rimraf('../ask-analytics');
  }
}
