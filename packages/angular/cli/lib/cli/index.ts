/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { format, stripVTControlCharacters } from 'node:util';
import { CommandModuleError } from '../../src/command-builder/command-module';
import { runCommand } from '../../src/command-builder/command-runner';
import { colors, supportColor } from '../../src/utilities/color';
import { ngDebug } from '../../src/utilities/environment-options';
import { writeErrorToLogFile } from '../../src/utilities/log-file';

export { VERSION } from '../../src/utilities/version';

const MIN_NODEJS_VERSION = [20, 11] as const;

/* eslint-disable no-console */
export default async function (options: { cliArgs: string[] }) {
  // This node version check ensures that the requirements of the project instance of the CLI are met
  const [major, minor] = process.versions.node.split('.').map((part) => Number(part));
  if (
    major < MIN_NODEJS_VERSION[0] ||
    (major === MIN_NODEJS_VERSION[0] && minor < MIN_NODEJS_VERSION[1])
  ) {
    process.stderr.write(
      `Node.js version ${process.version} detected.\n` +
        `The Angular CLI requires a minimum of v${MIN_NODEJS_VERSION[0]}.${MIN_NODEJS_VERSION[1]}.\n\n` +
        'Please update your Node.js version or visit https://nodejs.org/ for additional instructions.\n',
    );

    return 3;
  }

  const colorLevels: Record<string, (message: string) => string> = {
    info: (s) => s,
    debug: (s) => s,
    warn: (s) => colors.bold(colors.yellow(s)),
    error: (s) => colors.bold(colors.red(s)),
    fatal: (s) => colors.bold(colors.red(s)),
  };
  const logger = new logging.IndentLogger('cli-main-logger');
  const logInfo = console.log;
  const logError = console.error;
  const useColor = supportColor();

  const loggerFinished = logger.forEach((entry) => {
    if (!ngDebug && entry.level === 'debug') {
      return;
    }

    const color = useColor ? colorLevels[entry.level] : stripVTControlCharacters;
    const message = color(entry.message);

    switch (entry.level) {
      case 'warn':
      case 'fatal':
      case 'error':
        logError(message);
        break;
      default:
        logInfo(message);
        break;
    }
  });

  // Redirect console to logger
  console.info = console.log = function (...args) {
    logger.info(format(...args));
  };
  console.warn = function (...args) {
    logger.warn(format(...args));
  };
  console.error = function (...args) {
    logger.error(format(...args));
  };

  try {
    return await runCommand(options.cliArgs, logger);
  } catch (err) {
    if (err instanceof CommandModuleError) {
      logger.fatal(`Error: ${err.message}`);
    } else if (err instanceof Error) {
      try {
        const logPath = writeErrorToLogFile(err);
        logger.fatal(
          `An unhandled exception occurred: ${err.message}\n` +
            `See "${logPath}" for further details.`,
        );
      } catch (e) {
        logger.fatal(
          `An unhandled exception occurred: ${err.message}\n` +
            `Fatal error writing debug log file: ${e}`,
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
      logger.fatal(`An unexpected error occurred: ${err}`);
    }

    return 1;
  } finally {
    logger.complete();
    await loggerFinished;
  }
}
