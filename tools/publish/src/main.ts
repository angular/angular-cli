import 'reflect-metadata';

import {IndentLogger, LogEntry} from '@ngtools/logger';
import {bold, red, yellow, white} from 'chalk';
import * as minimist from 'minimist';


import 'rxjs/add/operator/filter';


const argv = minimist(process.argv.slice(2), {
  boolean: ['verbose']
});

const rootLogger = new IndentLogger('cling');

rootLogger
  .filter((entry: LogEntry) => (entry.level != 'debug' || argv['verbose']))
  .subscribe((entry: LogEntry) => {
    let color: (s: string) => string = white;
    let output = process.stdout;
    switch (entry.level) {
      case 'info': color = white; break;
      case 'warn': color = yellow; break;
      case 'error': color = red; output = process.stderr; break;
      case 'fatal': color = (x: string) => bold(red(x)); output = process.stderr; break;
    }

    output.write(color(entry.message) + '\n');
  });

rootLogger
  .filter((entry: LogEntry) => entry.level == 'fatal')
  .subscribe(() => {
    process.stderr.write('A fatal error happened. See details above.');
    process.exit(100);
  });


const command = argv._.shift();
let commandFn: (...args: any[]) => void = null;
switch (command) {
  case 'build': commandFn = require('./build').default; break;
  case 'build-schema': commandFn = require('./build-schema').default; break;
  case 'update-version': commandFn = require('./update-version').default; break;
  case 'changelog': commandFn = require('./changelog').default; break;
}

if (commandFn) {
  commandFn(argv._, argv, rootLogger);
}
