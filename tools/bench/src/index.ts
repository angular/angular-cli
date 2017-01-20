import { Logger, LogEntry } from '@ngtools/logger';
import { bold, red, yellow, white } from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as yargs from 'yargs';
import 'rxjs/add/operator/filter';

import { BenchmarkOptions } from './benchmark-options';
import { benchmark } from './benchmark';


// Set options via yargs
const benchmarkOptions: BenchmarkOptions = yargs
  .usage('$0 [args]')
  .options({
    'command': {
      description: 'Command to benchmark, defaults to benchmarking `ng serve` if not set',
      type: 'string',
      alias: 'c'
    },
    'iterations': {
      description: 'Number of iterations to run benchmark',
      type: 'number',
      default: 5,
      alias: 'i'
    },
    'extra-args': {
      description: 'Extra arguments to combine and run',
      type: 'array',
      default: [],
      alias: 'ea'
    },
    'match': {
      description: 'Command output to match',
      type: 'string',
      alias: 'm'
    },
    'match-count': {
      description: 'Times to match output',
      type: 'number',
      alias: 'mc'
    },
    'match-edit-file': {
      description: 'File to edit after a output match',
      type: 'string',
      alias: 'mef'
    },
    'match-edit-string': {
      description: 'String to use in --match-edit-file',
      type: 'string',
      alias: 'mes'
    },
    'comment': {
      description: 'Comment to add to output',
      type: 'string',
      alias: 'cm'
    },
    'log-file': {
      description: 'File to log output',
      type: 'string',
      alias: 'lf'
    },
    'debug': {
      description: 'Show command output',
      type: 'boolean',
      default: false,
      alias: 'd'
    },
  })
  .help()
  .argv;

// Initialize logger
const logger = new Logger('ngbench');

logger
  .filter((entry: LogEntry) => (entry.level != 'debug' || benchmarkOptions.debug))
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
    if (benchmarkOptions.logFile) {
      fs.appendFileSync(benchmarkOptions.logFile, entry.message + '\n');
    }
  });

logger
  .filter((entry: LogEntry) => entry.level == 'fatal')
  .subscribe(() => {
    process.stderr.write('A fatal error happened. See details above.');
    process.exit(1);
  });


// Set compound defauls and resolve paths
if (!benchmarkOptions.command) {
  benchmarkOptions.command = 'ng serve --no-progress';
  benchmarkOptions.match = benchmarkOptions.match || 'Time: (.*)ms';
  benchmarkOptions.matchCount = benchmarkOptions.matchCount || 4;
  benchmarkOptions.matchEditFile = benchmarkOptions.matchEditFile || 'src/main.ts';
  benchmarkOptions.matchEditString = benchmarkOptions.matchEditString || 'console.log(1);';
}

if (benchmarkOptions.matchEditFile) {
  benchmarkOptions.matchEditFile = path.resolve('./', benchmarkOptions.matchEditFile);
}

if (benchmarkOptions.command.match(/^ng (build|serve)/)
  && benchmarkOptions.command.match(/--no-progress/) === null
) {
  logger.warn('Auto-added \'--no-progress\' to build/serve command.');
  benchmarkOptions.command = benchmarkOptions.command + ' --no-progress';
}

// Run benchmark
benchmark(benchmarkOptions, logger)
  .catch((err) => {
    logger.fatal(JSON.stringify(err));
  });
