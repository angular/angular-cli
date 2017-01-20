import * as fs from 'fs';
import * as child_process from 'child_process';
import { Logger } from '@ngtools/logger';
const stripAnsi = require('strip-ansi');
const treeKill = require('tree-kill');

// Make all combinations of array elements
// http://stackoverflow.com/a/5752056/2116927
export function combine(array: any[]) {
  let fn = function (n: number, src: any[], got: any[], all: any[]) {
    if (n == 0) {
      if (got.length > 0) {
        all[all.length] = got;
      }
      return;
    }
    for (let j = 0; j < src.length; j++) {
      fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
    }
    return;
  };
  let all: any[] = [];
  for (let i = 0; i < array.length; i++) {
    fn(i, array, [], all);
  }
  if (array.length > 0) { all.push(array); }
  return all;
}

// Returns a promise with the result of calling `times` times the `fn` function with `args`
// `fn` will be called in serial, and is expected to return a promise
export function serialMultiPromise(times: number, fn: any, ...args: any[]) {
  let results: Promise<any>[] = [];
  let promise = Promise.resolve();
  Array.from({ length: times }).forEach(() => promise = promise.then(() =>
    fn.apply(null, args).then((result: Promise<any>) => results.push(result))
  ));
  return promise.then(() => results);
}

// Spawns `cmd` with `args`
// Calls `matchFn` with the `stdout` output, a `result` var and the process
// `dataFn` is expected to modify `result`
export function matchSpawn(logger: Logger, cwd: string, matchFn: any,
  cmd: string, args: string[] = []) {
  // dataFn will have access to result and use it to store results
  let result = {
    // overrideErr will signal that an error code on the exit event should be ignored
    // This is useful on windows where killing a tree of processes always makes them
    // exit with an error code
    overrideErr: false,
    time: 0
  };
  let stdout = '';
  let stderr = '';
  let spawnOptions: any = {
    cwd: cwd,
    env: process.env
  };

  // Split given `cmd` and pass on any args to `args`
  const splitCmd = cmd.split(' ');
  cmd = splitCmd.shift();
  args = splitCmd.concat(args);

  if (process.platform.startsWith('win')) {
    args = ['/c', cmd].concat(args);
    cmd = 'cmd.exe';
    spawnOptions['stdio'] = 'pipe';
  }

  logger.debug(`spawning cmd: ${cmd}, args: ${args}, cwd: ${cwd}`);

  const startTime = Date.now();
  const childProcess = child_process.spawn(cmd, args, spawnOptions);

  childProcess.stdout.on('data', (data: Buffer) => {
    let strippedData = stripAnsi(data.toString('utf-8'));
    logger.debug(strippedData);
    stdout += strippedData;
    if (matchFn) {
      matchFn(strippedData, result, childProcess);
    }
  });

  childProcess.stderr.on('data', (data: Buffer) => {
    let strippedData = stripAnsi(data.toString('utf-8'));
    logger.debug(strippedData);
    stderr += strippedData;
  });

  return new Promise((resolve, _) =>
    childProcess.on('exit', (err: number) => {
      result.time = Date.now() - startTime;
      return err && !result.overrideErr
        ? resolve({ err, stdout, stderr })
        : resolve(result);
    })
  );
}

// Makes a function that matches a RegExp to the process output, and then kills it
// Optionally matches `matchCount` times, and edits `editFile` by appending `editString`
export function makeMatchFn(
  logger: Logger,
  match: string,
  matchCount: number,
  editFile: string,
  editString: string
) {
  return function (data: string, result: any, childProcess: NodeJS.Process) {
    let localMatch = data.match(new RegExp(match));

    logger.debug(`Match output: ${localMatch}`);

    const killProcess = (childProcess: NodeJS.Process) => {
      result.overrideErr = true;
      treeKill(childProcess.pid);
    };
    if (localMatch) {
      let firstMatch = localMatch[1];
      if (!matchCount) {
        result.match = firstMatch;
        killProcess(childProcess);
      } else {
        result.counter = result.counter ? result.counter + 1 : 1;
        if (result.counter < matchCount) {
          if (editFile) {
            fs.appendFileSync(editFile, editString);
          }
        } else {
          result.match = firstMatch;
          killProcess(childProcess);
        }
      }
    }
  };
}
