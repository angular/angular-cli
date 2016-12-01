import * as child_process from 'child_process';
import {blue, white, yellow} from 'chalk';
const treeKill = require('tree-kill');


interface ExecOptions {
  silent?: boolean;
  waitForMatch?: RegExp;
}


let _processes: child_process.ChildProcess[] = [];

function _exec(options: ExecOptions, cmd: string, args: string[]): Promise<string> {
  let stdout = '';
  let stderr = '';
  const cwd = process.cwd();
  console.log(white(
    `  ==========================================================================================`
  ));

  args = args.filter(x => x !== undefined);
  const flags = [
    options.silent && 'silent',
    options.waitForMatch && `matching(${options.waitForMatch})`
  ]
    .filter(x => !!x)  // Remove false and undefined.
    .join(', ')
    .replace(/^(.+)$/, ' [$1]');  // Proper formatting.

  console.log(blue(`  Running \`${cmd} ${args.map(x => `"${x}"`).join(' ')}\`${flags}...`));
  console.log(blue(`  CWD: ${cwd}`));
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
        resolve(stdout);
      } else {
        err.message += `${error}...\n\nSTDOUT:\n${stdout}\n`;
        reject(err);
      }
    });

    if (options.waitForMatch) {
      childProcess.stdout.on('data', (data: Buffer) => {
        if (data.toString().match(options.waitForMatch)) {
          resolve(stdout);
        }
      });
    }
  });
}

export function killAllProcesses(signal = 'SIGTERM') {
  _processes.forEach(process => treeKill(process.pid, signal));
  _processes = [];
}

export function exec(cmd: string, ...args: string[]) {
  return _exec({}, cmd, args);
}

export function execAndWaitForOutputToMatch(cmd: string, args: string[], match: RegExp) {
  return _exec({ waitForMatch: match }, cmd, args);
}

export function silentExecAndWaitForOutputToMatch(cmd: string, args: string[], match: RegExp) {
  return _exec({ silent: true, waitForMatch: match }, cmd, args);
}

export function ng(...args: string[]) {
  if (args[0] == 'build' || args[0] == 'serve' || args[0] == 'test') {
    return silentNg(...args, '--no-progress');
  } else {
    return _exec({}, 'ng', args);
  }
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
