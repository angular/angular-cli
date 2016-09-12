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
  const cwd = process.cwd();
  console.log(white(
    `  ==========================================================================================`
  ));

  args = args.filter(x => x !== undefined);

  console.log(blue(`  Running \`${cmd} ${args.map(x => `"${x}"`).join(' ')}\`...`));
  console.log(blue(`  CWD: ${cwd}`));
  const spawnOptions: any = {cwd};

  if (process.platform.startsWith('win')) {
    args.unshift('/c', cmd);
    cmd = 'cmd.exe';
    spawnOptions['stdio'] = 'pipe';
  }

  const npmProcess = child_process.spawn(cmd, args, spawnOptions);
  npmProcess.stdout.on('data', (data: Buffer) => {
    stdout += data.toString('utf-8');
    if (options.silent) {
      return;
    }
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .filter(line => line !== '')
      .forEach(line => console.log('  ' + line));
  });
  npmProcess.stderr.on('data', (data: Buffer) => {
    if (options.silent) {
      return;
    }
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .filter(line => line !== '')
      .forEach(line => console.error(yellow('  ' + line)));
  });

  _processes.push(npmProcess);

  // Create the error here so the stack shows who called this function.
  const err = new Error(`Running "${cmd} ${args.join(' ')}" returned error code `);
  return new Promise((resolve, reject) => {
    npmProcess.on('exit', (error: any) => {
      _processes = _processes.filter(p => p !== npmProcess);

      if (!error) {
        resolve(stdout);
      } else {
        err.message += `${error}...`;
        reject(err);
      }
    });

    if (options.waitForMatch) {
      npmProcess.stdout.on('data', (data: Buffer) => {
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
  if (args[0] == 'build') {
    return _exec({silent: true}, 'ng', args);
  } else {
    return _exec({}, 'ng', args);
  }
}

export function silentNpm(...args: string[]) {
  return _exec({silent: true}, 'npm', args);
}

export function npm(...args: string[]) {
  return _exec({}, 'npm', args);
}

export function git(...args: string[]) {
  return _exec({}, 'git', args);
}

export function silentGit(...args: string[]) {
  return _exec({silent: true}, 'git', args);
}
