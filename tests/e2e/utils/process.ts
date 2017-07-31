import * as child_process from 'child_process';
import {blue, yellow} from 'chalk';
import {getGlobalVariable} from './env';
import {rimraf, writeFile} from './fs';
const treeKill = require('tree-kill');


interface ExecOptions {
  silent?: boolean;
  waitForMatch?: RegExp;
}


let _processes: child_process.ChildProcess[] = [];

type ProcessOutput = {
  stdout: string;
  stderr: string;
};


function _exec(options: ExecOptions, cmd: string, args: string[]): Promise<ProcessOutput> {
  let stdout = '';
  let stderr = '';
  const cwd = process.cwd();
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

  console.log(blue(`Running \`${cmd} ${args.map(x => `"${x}"`).join(' ')}\`${flags}...`));
  console.log(blue(`CWD: ${cwd}`));
  const spawnOptions: any = {cwd};

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
      .forEach(line => console.error(yellow('  ' + line)));
  });

  _processes.push(childProcess);

  // Create the error here so the stack shows who called this function.
  const err = new Error(`Running "${cmd} ${args.join(' ')}" returned error code `);
  return new Promise((resolve, reject) => {
    childProcess.on('exit', (error: any) => {
      _processes = _processes.filter(p => p !== childProcess);

      if (!error) {
        resolve({ stdout });
      } else {
        err.message += `${error}...\n\nSTDOUT:\n${stdout}\n`;
        reject(err);
      }
    });

    if (options.waitForMatch) {
      childProcess.stdout.on('data', (data: Buffer) => {
        if (data.toString().match(options.waitForMatch)) {
          resolve({ stdout, stderr });
        }
      });
    }
  });
}

export function waitForAnyProcessOutputToMatch(match: RegExp,
                                               timeout = 30000): Promise<ProcessOutput> {
  // Race between _all_ processes, and the timeout. First one to resolve/reject wins.
  return Promise.race(_processes.map(childProcess => new Promise(resolve => {
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
    });
  })).concat([
    new Promise((resolve, reject) => {
      // Wait for 30 seconds and timeout.
      setTimeout(() => {
        reject(new Error(`Waiting for ${match} timed out (timeout: ${timeout}msec)...`));
      }, timeout);
    })
  ]));
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

export function execAndWaitForOutputToMatch(cmd: string, args: string[], match: RegExp) {
  return _exec({ waitForMatch: match }, cmd, args);
}

export function silentExecAndWaitForOutputToMatch(cmd: string, args: string[], match: RegExp) {
  return _exec({ silent: true, waitForMatch: match }, cmd, args);
}


let npmInstalledEject = false;
export function ng(...args: string[]) {
  const argv = getGlobalVariable('argv');
  const maybeSilentNg = argv['nosilent'] ? noSilentNg : silentNg;
  if (['build', 'serve', 'test', 'e2e', 'xi18n'].indexOf(args[0]) != -1) {
    // If we have the --eject, use webpack for the test.
    if (args[0] == 'build' && argv.eject) {
      return maybeSilentNg('eject', ...args.slice(1), '--force')
        .then(() => {
          if (!npmInstalledEject) {
            npmInstalledEject = true;
            // We need to run npm install on the first eject.
            return silentNpm('install');
          }
        })
        .then(() => rimraf('dist'))
        .then(() => _exec({silent: true}, 'node_modules/.bin/webpack', []));
    } else if (args[0] == 'e2e') {
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
