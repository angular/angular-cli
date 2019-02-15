import { SpawnOptions } from "child_process";
import * as child_process from 'child_process';
import { terminal } from '@angular-devkit/core';
import { Observable, concat, defer, EMPTY, from} from 'rxjs';
import {repeat, takeLast} from 'rxjs/operators';
import {getGlobalVariable} from './env';
import {rimraf} from './fs';
import {catchError} from 'rxjs/operators';
const treeKill = require('tree-kill');


interface ExecOptions {
  silent?: boolean;
  waitForMatch?: RegExp;
  env?: { [varname: string]: string };
}


let _processes: child_process.ChildProcess[] = [];

export type ProcessOutput = {
  stdout: string;
  stderr: string;
};


function  _exec(options: ExecOptions, cmd: string, args: string[]): Promise<ProcessOutput> {
  let stdout = '';
  let stderr = '';
  const cwd = process.cwd();
  const env = options.env;
  console.log(
    `==========================================================================================`
  );

  args = args.filter(x => x !== undefined);
  const flags = [
    options.silent && 'silent',
    options.waitForMatch && `matching(${options.waitForMatch})`
  ]
    .filter(x => !!x)  // Remove false and undefined.
    .join(', ')
    .replace(/^(.+)$/, ' [$1]');  // Proper formatting.

  console.log(terminal.blue(`Running \`${cmd} ${args.map(x => `"${x}"`).join(' ')}\`${flags}...`));
  console.log(terminal.blue(`CWD: ${cwd}`));
  console.log(terminal.blue(`ENV: ${JSON.stringify(env)}`));
  const spawnOptions: SpawnOptions = {
    cwd,
    ...env ? { env } : {},
  };

  if (process.platform.startsWith('win')) {
    args.unshift('/c', cmd);
    cmd = 'cmd.exe';
    spawnOptions['stdio'] = 'pipe';
  }

  const childProcess = child_process.spawn(cmd, args, spawnOptions);
  childProcess.stdout.on('data', (data: Buffer) => {
    stdout += data.toString('utf-8');
    if (options.silent) {
      return;
    }
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .filter(line => line !== '')
      .forEach(line => console.log('  ' + line));
  });
  childProcess.stderr.on('data', (data: Buffer) => {
    stderr += data.toString('utf-8');
    if (options.silent) {
      return;
    }
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .filter(line => line !== '')
      .forEach(line => console.error(terminal.yellow('  ' + line)));
  });

  _processes.push(childProcess);

  // Create the error here so the stack shows who called this function.
  const err = new Error(`Running "${cmd} ${args.join(' ')}" returned error code `);
  return new Promise((resolve, reject) => {
    childProcess.on('exit', (error: any) => {
      _processes = _processes.filter(p => p !== childProcess);

      if (!error) {
        resolve({ stdout, stderr });
      } else {
        err.message += `${error}...\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`;
        reject(err);
      }
    });

    if (options.waitForMatch) {
      const match = options.waitForMatch;
      childProcess.stdout.on('data', (data: Buffer) => {
        if (data.toString().match(match)) {
          resolve({ stdout, stderr });
        }
      });
      childProcess.stderr.on('data', (data: Buffer) => {
        if (data.toString().match(match)) {
          resolve({ stdout, stderr });
        }
      });
    }
  });
}

export function waitForAnyProcessOutputToMatch(match: RegExp,
                                               timeout = 30000): Promise<ProcessOutput> {
  // Race between _all_ processes, and the timeout. First one to resolve/reject wins.
  const timeoutPromise: Promise<ProcessOutput> = new Promise((_resolve, reject) => {
    // Wait for 30 seconds and timeout.
    setTimeout(() => {
      reject(new Error(`Waiting for ${match} timed out (timeout: ${timeout}msec)...`));
    }, timeout);
  });

  const matchPromises: Promise<ProcessOutput>[] = _processes.map(
    childProcess => new Promise(resolve => {
      let stdout = '';
      let stderr = '';
      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        if (data.toString().match(match)) {
          resolve({ stdout, stderr });
        }
      });
      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        if (data.toString().match(match)) {
          resolve({ stdout, stderr });
        }
      });
    }));

  return Promise.race(matchPromises.concat([timeoutPromise]));
}

export function killAllProcesses(signal = 'SIGTERM') {
  _processes.forEach(process => treeKill(process.pid, signal));
  _processes = [];
}

export function exec(cmd: string, ...args: string[]) {
  return _exec({}, cmd, args);
}

export function silentExec(cmd: string, ...args: string[]) {
  return _exec({ silent: true }, cmd, args);
}

export function execWithEnv(cmd: string, args: string[], env: { [varname: string]: string }) {
  return _exec({ env }, cmd, args);
}

export function execAndWaitForOutputToMatch(cmd: string, args: string[], match: RegExp) {
  if (cmd === 'ng' && args[0] === 'serve') {
    // Accept matches up to 20 times after the initial match.
    // Useful because the Webpack watcher can rebuild a few times due to files changes that
    // happened just before the build (e.g. `git clean`).
    // This seems to be due to host file system differences, see
    // https://nodejs.org/docs/latest/api/fs.html#fs_caveats
    return concat(
      from(
        _exec({ waitForMatch: match }, cmd, args)
      ),
      defer(() => waitForAnyProcessOutputToMatch(match, 2500)).pipe(
        repeat(20),
        catchError(() => EMPTY),
      ),
    ).pipe(
      takeLast(1),
    ).toPromise();
  } else {
    return _exec({ waitForMatch: match }, cmd, args);
  }
}

export function ng(...args: string[]) {
  const argv = getGlobalVariable('argv');
  const maybeSilentNg = argv['nosilent'] ? noSilentNg : silentNg;
  if (['build', 'serve', 'test', 'e2e', 'xi18n'].indexOf(args[0]) != -1) {
    if (args[0] == 'e2e') {
      // Wait 1 second before running any end-to-end test.
      return new Promise(resolve => setTimeout(resolve, 1000))
        .then(() => maybeSilentNg(...args));
    }

    return maybeSilentNg(...args);
  } else {
    return noSilentNg(...args);
  }
}

export function noSilentNg(...args: string[]) {
  return _exec({}, 'ng', args);
}

export function silentNg(...args: string[]) {
  return _exec({silent: true}, 'ng', args);
}

export function silentNpm(...args: string[]) {
  return _exec({silent: true}, 'npm', args);
}

export function npm(...args: string[]) {
  return _exec({}, 'npm', args);
}

export function node(...args: string[]) {
  return _exec({}, 'node', args);
}

export function git(...args: string[]) {
  return _exec({}, 'git', args);
}

export function silentGit(...args: string[]) {
  return _exec({silent: true}, 'git', args);
}
