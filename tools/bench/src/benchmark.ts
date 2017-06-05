import { Logger } from '@ngtools/logger';
import * as fs from 'fs';
const mean = require('lodash/mean');
const toNumber = require('lodash/toNumber');


import { BenchmarkOptions } from './benchmark-options';
import {
  combine,
  makeMatchFn,
  matchSpawn,
  serialMultiPromise
} from './utils';

export function benchmark(benchmarkOptions: BenchmarkOptions, logger: Logger) {
  const logIfDefined = (str: string, prop: any) => {
    if (Array.isArray(prop) && prop.length === 0) {
      prop = null;
    }
    return prop ? logger.info(str + prop) : null;
  };

  const cwd = process.cwd();

  // Build match function
  let matchFn: any = null;
  if (benchmarkOptions.match) {
    matchFn = makeMatchFn(
      logger,
      benchmarkOptions.match,
      benchmarkOptions.matchCount,
      benchmarkOptions.matchEditFile,
      benchmarkOptions.matchEditString,
    );
  }

  let editedFileContents: string;
  if (benchmarkOptions.matchEditFile) {
    // backup contents of file that is being edited for rebuilds
    editedFileContents = fs.readFileSync(benchmarkOptions.matchEditFile, 'utf8');
  }
  // combine flags commands
  let flagCombinations = combine(benchmarkOptions.extraArgs);
  flagCombinations.unshift([]);

  const startTime = Date.now();
  logger.info(`Base command: ${benchmarkOptions.command}`);
  logger.info(`Iterations: ${benchmarkOptions.iterations}`);
  logIfDefined('Comment: ', benchmarkOptions.comment);
  logIfDefined('Extra args: ', benchmarkOptions.extraArgs);
  logIfDefined('Logging to: ', benchmarkOptions.logFile);
  if (benchmarkOptions.match) {
    logger.info(`Match output: ${benchmarkOptions.match}`);
    logIfDefined('Match count: ', benchmarkOptions.matchCount);
    logIfDefined('Match edit file: ', benchmarkOptions.matchEditFile);
    logIfDefined('Match edit string: ', benchmarkOptions.matchEditString);
  }
  if (benchmarkOptions.debug) {
    logger.debug('### Debug mode, all output is logged ###');
  }
  logger.info('');


  let promise = Promise.resolve();
  let hasFailures = false;

  flagCombinations.forEach((flags) =>
    promise = promise
      .then(() => serialMultiPromise(
        benchmarkOptions.iterations,
        matchSpawn,
        logger,
        cwd,
        matchFn,
        benchmarkOptions.command,
        flags
      ).then((results: any[]) => {
        const failures = results.filter(result => result.err && result.err !== 0);
        logger.info(`Full command: ${benchmarkOptions.command} ${flags.join(' ')}`);

        let times = results.filter(result => !result.err)
          .map((result) => result.time);
        logger.info(`Time average: ${mean(times)}`);
        logger.info(`Times: ${times.join()}`);

        if (benchmarkOptions.match) {
          let matches = results.filter(result => !result.err)
            .map((result) => result.match);

          let matchesAsNumbers = matches.map(toNumber);
          if (matches.every(match => match != NaN)) {
            logger.info(`Match average: ${mean(matchesAsNumbers)}`);
          }
          logger.info(`Matches: ${matches.join()}`);
        }

        if (failures.length > 0) {
          hasFailures = true;
          logger.info(`Failures: ${failures.length}`);
          logger.info(JSON.stringify(failures));
        }
        logger.info('');
      }))
  );

  return promise.then(() => {
    logger.info(`Benchmark execution time: ${Date.now() - startTime}ms`);
    // restore contents of file that was being edited for rebuilds
    if (benchmarkOptions.matchEditFile) {
      fs.writeFileSync(benchmarkOptions.matchEditFile, editedFileContents, 'utf8');
    }
    return hasFailures ? Promise.reject(new Error('Some benchmarks failed')) : Promise.resolve();
  });
}
