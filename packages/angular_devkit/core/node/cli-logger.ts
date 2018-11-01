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
): logging.Logger {
  const logger = new logging.IndentLogger('cling');

  logger
    .pipe(filter(entry => (entry.level != 'debug' || verbose)))
    .subscribe(entry => {
      let color: (s: string) => string = x => terminal.dim(terminal.white(x));
      let output = stdout;
      switch (entry.level) {
        case 'info':
          color = terminal.white;
          break;
        case 'warn':
          color = (x: string) => terminal.bold(terminal.yellow(x));
          break;
        case 'fatal':
        case 'error':
          color = (x: string) => terminal.bold(terminal.red(x));
          output = stderr;
          break;
      }

      output.write(color(entry.message) + '\n');
    });

  return logger;
}
