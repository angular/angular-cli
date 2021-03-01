/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createConsoleLogger } from '@angular-devkit/core/node';
import { format } from 'util';
import { runCommand } from '../../models/command-runner';
import { colors, removeColor } from '../../utilities/color';
import { AngularWorkspace, getWorkspaceRaw } from '../../utilities/config';
import { writeErrorToLogFile } from '../../utilities/log-file';
import { findWorkspaceFile } from '../../utilities/project';

export { VERSION, Version } from '../../models/version';

const debugEnv = process.env['NG_DEBUG'];
const isDebug =
  debugEnv !== undefined &&
  debugEnv !== '0' &&
  debugEnv.toLowerCase() !== 'false';

// tslint:disable: no-console
export default async function(options: { testing?: boolean; cliArgs: string[] }) {
  // This node version check ensures that the requirements of the project instance of the CLI are met
  const version = process.versions.node.split('.').map(part => Number(part));
  if (version[0] < 10 || version[0] === 11 || (version[0] === 10 && version[1] < 13)) {
    process.stderr.write(
      `Node.js version ${process.version} detected.\n` +
      'The Angular CLI requires a minimum Node.js version of either v10.13 or v12.0.\n\n' +
      'Please update your Node.js version or visit https://nodejs.org/ for additional instructions.\n',
    );

    return 3;
  }

  const logger = createConsoleLogger(isDebug, process.stdout, process.stderr, {
    info: s => (colors.enabled ? s : removeColor(s)),
    debug: s => (colors.enabled ? s : removeColor(s)),
    warn: s => (colors.enabled ? colors.bold.yellow(s) : removeColor(s)),
    error: s => (colors.enabled ? colors.bold.red(s) : removeColor(s)),
    fatal: s => (colors.enabled ? colors.bold.red(s) : removeColor(s)),
  });

  // Redirect console to logger
  console.info = console.log = function(...args) {
    logger.info(format(...args));
  };
  console.warn = function(...args) {
    logger.warn(format(...args));
  };
  console.error = function(...args) {
    logger.error(format(...args));
  };

  let workspace;
  const workspaceFile = findWorkspaceFile();
  if (workspaceFile === null) {
    const [, localPath] = getWorkspaceRaw('local');
    if (localPath !== null) {
      logger.fatal(
        `An invalid configuration file was found ['${localPath}'].` +
          ' Please delete the file before running the command.',
      );

      return 1;
    }
  } else {
    try {
      workspace = await AngularWorkspace.load(workspaceFile);
    } catch (e) {
      logger.fatal(`Unable to read workspace file '${workspaceFile}': ${e.message}`);

      return 1;
    }
  }

  try {
    const maybeExitCode = await runCommand(options.cliArgs, logger, workspace);
    if (typeof maybeExitCode === 'number') {
      console.assert(Number.isInteger(maybeExitCode));

      return maybeExitCode;
    }

    return 0;
  } catch (err) {
    if (err instanceof Error) {
      try {
        const logPath = writeErrorToLogFile(err);
        logger.fatal(
          `An unhandled exception occurred: ${err.message}\n` +
            `See "${logPath}" for further details.`,
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
      // tslint:disable-next-line: no-debugger
      debugger;
      throw err;
    }

    return 1;
  }
}
