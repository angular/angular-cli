/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { terminal } from '@angular-devkit/core';
import { createConsoleLogger } from '@angular-devkit/core/node';
import { runCommand } from '../../models/command-runner';
import { getWorkspaceRaw } from '../../utilities/config';
import { getWorkspaceDetails } from '../../utilities/project';


export default async function(options: { testing?: boolean, cliArgs: string[] }) {
  const logger = createConsoleLogger(
    false,
    process.stdout,
    process.stderr,
    {
      warn: s => terminal.bold(terminal.yellow(s)),
      error: s => terminal.bold(terminal.red(s)),
      fatal: s => terminal.bold(terminal.red(s)),
    },
  );

  let projectDetails = getWorkspaceDetails();
  if (projectDetails === null) {
    const [, localPath] = getWorkspaceRaw('local');
    if (localPath !== null) {
      logger.fatal(`An invalid configuration file was found ['${localPath}'].`
                 + ' Please delete the file before running the command.');

      return 1;
    }

    projectDetails = { root: process.cwd() };
  }

  try {
    const maybeExitCode = await runCommand(options.cliArgs, logger, projectDetails);
    if (typeof maybeExitCode === 'number') {
      console.assert(Number.isInteger(maybeExitCode));

      return maybeExitCode;
    }

    return 0;
  } catch (err) {
    if (err instanceof Error) {
      try {
        const fs = await import('fs');
        const os = await import('os');
        const tempDirectory = fs.mkdtempSync(fs.realpathSync(os.tmpdir()) + '/' + 'ng-');
        const logPath = tempDirectory + '/angular-errors.log';
        fs.appendFileSync(logPath, '[error] ' + (err.stack || err));

        logger.fatal(
          `An unhandled exception occurred: ${err.message}\n` +
          `See "${logPath}" for further details.\n\n` +
          'Please report with the contents of the log file at ' +
          'https://github.com/angular/angular-cli/issues/new?template=1-bug-report.md',
        );
      } catch (e) {
        logger.fatal(
          `An unhandled exception occurred: ${err.message}\n` +
          `Fatal error writing debug log file: ${e.message}`,
        );
        if (err.stack) {
          logger.fatal(err.stack);
        }
      }

      return 127;
    } else if (typeof err === 'string') {
      logger.fatal(err);
    } else if (typeof err === 'number') {
      // Log nothing.
    } else {
      logger.fatal('An unexpected error occurred: ' + JSON.stringify(err));
    }

    if (options.testing) {
      debugger;
      throw err;
    }

    return 1;
  }
}
