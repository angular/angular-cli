/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging, terminal } from '@angular-devkit/core';
import { runCommand } from '../../models/command-runner';
import { getWorkspaceRaw } from '../../utilities/config';
import { getWorkspaceDetails } from '../../utilities/project';


export default async function(options: { testing?: boolean, cliArgs: string[] }) {
  const logger = new logging.IndentLogger('cling');
  let loggingSubscription;
  if (!options.testing) {
    loggingSubscription = initializeLogging(logger);
  }

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
      logger.fatal(err.message);
      if (err.stack) {
        logger.fatal(err.stack);
      }
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

    if (loggingSubscription) {
      loggingSubscription.unsubscribe();
    }

    return 1;
  }
}

// Initialize logging.
function initializeLogging(logger: logging.Logger) {
  return logger
    .subscribe(entry => {
      let color = (x: string) => terminal.dim(terminal.white(x));
      let output = process.stdout;
      switch (entry.level) {
        case 'debug':
          return;
        case 'info':
          color = terminal.white;
          break;
        case 'warn':
          color = (x: string) => terminal.bold(terminal.yellow(x));
          output = process.stderr;
          break;
        case 'fatal':
        case 'error':
          color = (x: string) => terminal.bold(terminal.red(x));
          output = process.stderr;
          break;
      }


      // If we do console.log(message) or process.stdout.write(message + '\n'), the process might
      // stop before the whole message is written and the stream is flushed. This happens when
      // streams are asynchronous.
      //
      // NodeJS IO streams are different depending on platform and usage. In POSIX environment,
      // for example, they're asynchronous when writing to a pipe, but synchronous when writing
      // to a TTY. In windows, it's the other way around. You can verify which is which with
      // stream.isTTY and platform, but this is not good enough.
      // In the async case, one should wait for the callback before sending more data or
      // continuing the process. In our case it would be rather hard to do (but not impossible).
      //
      // Instead we take the easy way out and simply chunk the message and call the write
      // function while the buffer drain itself asynchronously. With a smaller chunk size than
      // the buffer, we are mostly certain that it works. In this case, the chunk has been picked
      // as half a page size (4096/2 = 2048), minus some bytes for the color formatting.
      // On POSIX it seems the buffer is 2 pages (8192), but just to be sure (could be different
      // by platform).
      //
      // For more details, see https://nodejs.org/api/process.html#process_a_note_on_process_i_o
      const chunkSize = 2000;  // Small chunk.
      let message = entry.message;
      while (message) {
        const chunk = message.slice(0, chunkSize);
        message = message.slice(chunkSize);
        output.write(color(chunk));
      }
      output.write('\n');
    });
}
