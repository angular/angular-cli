/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { IndentLogger, LogEntry, Logger, terminal } from '@angular-devkit/core';
import 'rxjs/add/operator/filter';


/**
 * A Logger that sends information to STDOUT and STDERR.
 */
export function createConsoleLogger(verbose = false): Logger {
  const logger = new IndentLogger('cling');

  logger
    .filter((entry: LogEntry) => (entry.level != 'debug' || verbose))
    .subscribe((entry: LogEntry) => {
      let color: (s: string) => string = x => terminal.dim(terminal.white(x));
      let output = process.stdout;
      switch (entry.level) {
        case 'info':
          color = terminal.white;
          break;
        case 'warn':
          color = terminal.yellow;
          break;
        case 'error':
          color = terminal.red;
          output = process.stderr;
          break;
        case 'fatal':
          color = (x: string) => terminal.bold(terminal.red(x));
          output = process.stderr;
          break;
      }

      output.write(color(entry.message) + '\n');
    });

  return logger;
}
