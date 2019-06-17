/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createConsoleLogger } from '@angular-devkit/core/node';
import * as colors from 'ansi-colors';
import { WriteStream } from 'tty';
import { format } from 'util';
import { runCommand } from '../../models/command-runner';
import { getWorkspaceRaw } from '../../utilities/config';
import { getWorkspaceDetails } from '../../utilities/project';

export default async function(options: { testing?: boolean, cliArgs: string[] }) {
  // Typings do not contain the function call (added in Node.js v9.9.0)
  const supportsColor = process.stdout instanceof WriteStream &&
    (process.stdout as unknown as { getColorDepth(): number }).getColorDepth() > 1;

  const logger = createConsoleLogger(
    false,
    process.stdout,
    process.stderr,
    {
      info: s => supportsColor ? s : colors.unstyle(s),
      debug: s => supportsColor ? s : colors.unstyle(s),
      warn: s => supportsColor ? colors.bold.yellow(s) : colors.unstyle(s),
      error: s => supportsColor ? colors.bold.red(s) : colors.unstyle(s),
      fatal: s => supportsColor ? colors.bold.red(s) : colors.unstyle(s),
    },
  );

  // Redirect console to logger
  console.log = function() { logger.info(format.apply(null, arguments)); };
  console.info = function() { logger.info(format.apply(null, arguments)); };
  console.warn = function() { logger.warn(format.apply(null, arguments)); };
  console.error = function() { logger.error(format.apply(null, arguments)); };

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
