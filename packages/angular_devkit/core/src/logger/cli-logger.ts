/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {IndentLogger} from './indent';
import {LogEntry, Logger} from './logger';

import {bold, dim, yellow, red, white} from '../terminal';

import 'rxjs/add/operator/filter';


/**
 * A Logger that sends information to STDOUT and STDERR.
 */
export function createLogger(verbose = false): Logger {
  const logger = new IndentLogger('cling');

  logger
    .filter((entry: LogEntry) => (entry.level != 'debug' || verbose))
    .subscribe((entry: LogEntry) => {
      let color: (s: string) => string = x => dim(white(x));
      let output = process.stdout;
      switch (entry.level) {
        case 'info':
          color = white;
          break;
        case 'warn':
          color = yellow;
          break;
        case 'error':
          color = red;
          output = process.stderr;
          break;
        case 'fatal':
          color = (x: string) => bold(red(x));
          output = process.stderr;
          break;
      }

      output.write(color(entry.message) + '\n');
    });

  return logger;
}
