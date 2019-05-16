/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { filter } from 'rxjs/operators';
import { logging, terminal } from '../src';

export interface ProcessOutput {
  write(buffer: string | Buffer): boolean;
}

/**
 * A Logger that sends information to STDOUT and STDERR.
 */
export function createConsoleLogger(
  verbose = false,
  stdout: ProcessOutput = process.stdout,
  stderr: ProcessOutput = process.stderr,
  colors?: Partial<Record<logging.LogLevel, (s: string) => string>>,
): logging.Logger {
  const logger = new logging.IndentLogger('cling');

  logger
    .pipe(filter(entry => (entry.level != 'debug' || verbose)))
    .subscribe(entry => {
      let color = colors && colors[entry.level];
      let output = stdout;
      switch (entry.level) {
        case 'info':
          break;
        case 'warn':
          color = color || (s => terminal.bold(terminal.yellow(s)));
          output = stderr;
          break;
        case 'fatal':
        case 'error':
          color = color || (s => terminal.bold(terminal.red(s)));
          output = stderr;
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
        output.write(color ? color(chunk) : chunk);
      }
      output.write('\n');
    });

  return logger;
}
