/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { env } from 'process';

/**
 * Sets up autocompletion for the user's terminal. This attempts to find the configuration file for
 * the current shell (`.bashrc`, `.zshrc`, etc.) and append a command which enables autocompletion
 * for the Angular CLI. Supports only Bash and Zsh. Returns whether or not it was successful.
 * @return The full path of the configuration file modified.
 */
export async function initializeAutocomplete(): Promise<string> {
  // Get the currently active `$SHELL` and `$HOME` environment variables.
  const shell = env['SHELL'];
  if (!shell) {
    throw new Error(
      '`$SHELL` environment variable not set. Angular CLI autocompletion only supports Bash or' +
        ' Zsh.',
    );
  }
  const home = env['HOME'];
  if (!home) {
    throw new Error(
      '`$HOME` environment variable not set. Setting up autocompletion modifies configuration files' +
        ' in the home directory and must be set.',
    );
  }

  // Get all the files we can add `ng completion` to which apply to the user's `$SHELL`.
  const runCommandCandidates = getShellRunCommandCandidates(shell, home);
  if (!runCommandCandidates) {
    throw new Error(
      `Unknown \`$SHELL\` environment variable value (${shell}). Angular CLI autocompletion only supports Bash or Zsh.`,
    );
  }

  // Get the first file that already exists or fallback to a new file of the first candidate.
  const candidates = await Promise.allSettled(
    runCommandCandidates.map((rcFile) => fs.access(rcFile).then(() => rcFile)),
  );
  const rcFile =
    candidates.find(
      (result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled',
    )?.value ?? runCommandCandidates[0];

  // Append Angular autocompletion setup to RC file.
  try {
    await fs.appendFile(
      rcFile,
      '\n\n# Load Angular CLI autocompletion.\nsource <(ng completion script)\n',
    );
  } catch (err) {
    throw new Error(`Failed to append autocompletion setup to \`${rcFile}\`:\n${err.message}`);
  }

  return rcFile;
}

/** Returns an ordered list of possibile candidates of RC files used by the given shell. */
function getShellRunCommandCandidates(shell: string, home: string): string[] | undefined {
  if (shell.toLowerCase().includes('bash')) {
    return ['.bashrc', '.bash_profile', '.profile'].map((file) => path.join(home, file));
  } else if (shell.toLowerCase().includes('zsh')) {
    return ['.zshrc', '.zsh_profile', '.profile'].map((file) => path.join(home, file));
  } else {
    return undefined;
  }
}
