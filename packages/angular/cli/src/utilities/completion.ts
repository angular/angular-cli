/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json, logging } from '@angular-devkit/core';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { env } from 'process';
import { colors } from '../utilities/color';
import { getWorkspace } from '../utilities/config';
import { forceAutocomplete } from '../utilities/environment-options';
import { isTTY } from '../utilities/tty';
import { assertIsError } from './error';

/** Interface for the autocompletion configuration stored in the global workspace. */
interface CompletionConfig {
  /**
   * Whether or not the user has been prompted to set up autocompletion. If `true`, should *not*
   * prompt them again.
   */
  prompted?: boolean;
}

/**
 * Checks if it is appropriate to prompt the user to setup autocompletion. If not, does nothing. If
 * so prompts and sets up autocompletion for the user. Returns an exit code if the program should
 * terminate, otherwise returns `undefined`.
 * @returns an exit code if the program should terminate, undefined otherwise.
 */
export async function considerSettingUpAutocompletion(
  command: string,
  logger: logging.Logger,
): Promise<number | undefined> {
  // Check if we should prompt the user to setup autocompletion.
  const completionConfig = await getCompletionConfig();
  if (!(await shouldPromptForAutocompletionSetup(command, completionConfig))) {
    return undefined; // Already set up or prompted previously, nothing to do.
  }

  // Prompt the user and record their response.
  const shouldSetupAutocompletion = await promptForAutocompletion();
  if (!shouldSetupAutocompletion) {
    // User rejected the prompt and doesn't want autocompletion.
    logger.info(
      `
Ok, you won't be prompted again. Should you change your mind, the following command will set up autocompletion for you:

    ${colors.yellow(`ng completion`)}
    `.trim(),
    );

    // Save configuration to remember that the user was prompted and avoid prompting again.
    await setCompletionConfig({ ...completionConfig, prompted: true });

    return undefined;
  }

  // User accepted the prompt, set up autocompletion.
  let rcFile: string;
  try {
    rcFile = await initializeAutocomplete();
  } catch (err) {
    assertIsError(err);
    // Failed to set up autocompeletion, log the error and abort.
    logger.error(err.message);

    return 1;
  }

  // Notify the user autocompletion was set up successfully.
  logger.info(
    `
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${colors.yellow(`source <(ng completion script)`)}
    `.trim(),
  );

  if (!(await hasGlobalCliInstall())) {
    logger.warn(
      'Setup completed successfully, but there does not seem to be a global install of the' +
        ' Angular CLI. For autocompletion to work, the CLI will need to be on your `$PATH`, which' +
        ' is typically done with the `-g` flag in `npm install -g @angular/cli`.' +
        '\n\n' +
        'For more information, see https://angular.io/cli/completion#global-install',
    );
  }

  // Save configuration to remember that the user was prompted.
  await setCompletionConfig({ ...completionConfig, prompted: true });

  return undefined;
}

async function getCompletionConfig(): Promise<CompletionConfig | undefined> {
  const wksp = await getWorkspace('global');

  return wksp?.getCli()?.['completion'];
}

async function setCompletionConfig(config: CompletionConfig): Promise<void> {
  const wksp = await getWorkspace('global');
  if (!wksp) {
    throw new Error(`Could not find global workspace`);
  }

  wksp.extensions['cli'] ??= {};
  const cli = wksp.extensions['cli'];
  if (!json.isJsonObject(cli)) {
    throw new Error(
      `Invalid config found at ${wksp.filePath}. \`extensions.cli\` should be an object.`,
    );
  }
  cli.completion = config as json.JsonObject;
  await wksp.save();
}

async function shouldPromptForAutocompletionSetup(
  command: string,
  config?: CompletionConfig,
): Promise<boolean> {
  // Force whether or not to prompt for autocomplete to give an easy path for e2e testing to skip.
  if (forceAutocomplete !== undefined) {
    return forceAutocomplete;
  }

  // Don't prompt on `ng update` or `ng completion`.
  if (command === 'update' || command === 'completion') {
    return false;
  }

  // Non-interactive and continuous integration systems don't care about autocompletion.
  if (!isTTY()) {
    return false;
  }

  // Skip prompt if the user has already been prompted.
  if (config?.prompted) {
    return false;
  }

  // `$HOME` variable is necessary to find RC files to modify.
  const home = env['HOME'];
  if (!home) {
    return false;
  }

  // Get possible RC files for the current shell.
  const shell = env['SHELL'];
  if (!shell) {
    return false;
  }
  const rcFiles = getShellRunCommandCandidates(shell, home);
  if (!rcFiles) {
    return false; // Unknown shell.
  }

  // Don't prompt if the user is missing a global CLI install. Autocompletion won't work after setup
  // anyway and could be annoying for users running one-off commands via `npx` or using `npm start`.
  if ((await hasGlobalCliInstall()) === false) {
    return false;
  }

  // Check each RC file if they already use `ng completion script` in any capacity and don't prompt.
  for (const rcFile of rcFiles) {
    const contents = await fs.readFile(rcFile, 'utf-8').catch(() => undefined);
    if (contents?.includes('ng completion script')) {
      return false;
    }
  }

  return true;
}

async function promptForAutocompletion(): Promise<boolean> {
  // Dynamically load `inquirer` so users don't have to pay the cost of parsing and executing it for
  // the 99% of builds that *don't* prompt for autocompletion.
  const { prompt } = await import('inquirer');
  const { autocomplete } = await prompt<{ autocomplete: boolean }>([
    {
      name: 'autocomplete',
      type: 'confirm',
      message: `
Would you like to enable autocompletion? This will set up your terminal so pressing TAB while typing
Angular CLI commands will show possible options and autocomplete arguments. (Enabling autocompletion
will modify configuration files in your home directory.)
      `
        .split('\n')
        .join(' ')
        .trim(),
      default: true,
    },
  ]);

  return autocomplete;
}

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
        " Zsh. If you're on Windows, Cmd and Powershell don't support command autocompletion," +
        ' but Git Bash or Windows Subsystem for Linux should work, so please try again in one of' +
        ' those environments.',
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
    assertIsError(err);
    throw new Error(`Failed to append autocompletion setup to \`${rcFile}\`:\n${err.message}`);
  }

  return rcFile;
}

/** Returns an ordered list of possible candidates of RC files used by the given shell. */
function getShellRunCommandCandidates(shell: string, home: string): string[] | undefined {
  if (shell.toLowerCase().includes('bash')) {
    return ['.bashrc', '.bash_profile', '.profile'].map((file) => path.join(home, file));
  } else if (shell.toLowerCase().includes('zsh')) {
    return ['.zshrc', '.zsh_profile', '.profile'].map((file) => path.join(home, file));
  } else {
    return undefined;
  }
}

/**
 * Returns whether the user has a global CLI install.
 * Execution from `npx` is *not* considered a global CLI install.
 *
 * This does *not* mean the current execution is from a global CLI install, only that a global
 * install exists on the system.
 */
export function hasGlobalCliInstall(): Promise<boolean> {
  // List all binaries with the `ng` name on the user's `$PATH`.
  return new Promise<boolean>((resolve) => {
    execFile('which', ['-a', 'ng'], (error, stdout) => {
      if (error) {
        // No instances of `ng` on the user's `$PATH`

        // `which` returns exit code 2 if an invalid option is specified and `-a` doesn't appear to be
        // supported on all systems. Other exit codes mean unknown errors occurred. Can't tell whether
        // CLI is globally installed, so treat this as inconclusive.

        // `which` was killed by a signal and did not exit gracefully. Maybe it hung or something else
        // went very wrong, so treat this as inconclusive.
        resolve(false);

        return;
      }

      // Successfully listed all `ng` binaries on the `$PATH`. Look for at least one line which is a
      // global install. We can't easily identify global installs, but local installs are typically
      // placed in `node_modules/.bin` by NPM / Yarn. `npx` also currently caches files at
      // `~/.npm/_npx/*/node_modules/.bin/`, so the same logic applies.
      const lines = stdout.split('\n').filter((line) => line !== '');
      const hasGlobalInstall = lines.some((line) => {
        // A binary is a local install if it is a direct child of a `node_modules/.bin/` directory.
        const parent = path.parse(path.parse(line).dir);
        const grandparent = path.parse(parent.dir);
        const localInstall = grandparent.base === 'node_modules' && parent.base === '.bin';

        return !localInstall;
      });

      return resolve(hasGlobalInstall);
    });
  });
}
