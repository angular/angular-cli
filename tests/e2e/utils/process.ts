import {ChildProcess, spawn} from 'child_process';
import {blue, white, yellow} from 'chalk';


interface ExecOptions {
  silent?: boolean;
}


let _processes: ChildProcess[] = [];

function _exec(options: ExecOptions, cmd: string, args: string[]): Promise<string> {
  let stdout = '';
  const cwd = process.cwd();
  console.log(white(
    `  ==========================================================================================`
  ));

  args = args.filter(x => x !== undefined);
  console.log(blue(`  Running \`${cmd} ${args.map(x => `"${x}"`).join(' ')}\`...`));
  console.log(blue(`  CWD: ${cwd}`));

  const npmProcess = spawn(cmd, args, {cwd, detached: true});
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
    npmProcess.on('close', (code: number) => {
      _processes = _processes.filter(p => p !== npmProcess);

      if (code == 0) {
        resolve(stdout);
      } else {
        err.message += `${code}...`;
        reject(err);
      }
    });
  });
}

export function killAllProcesses(signal: string = 'SIGKILL') {
  _processes.forEach(process => process.kill(signal));
  _processes = [];
}

export function exec(cmd: string, ...args: string[]) {
  return _exec({}, cmd, args);
}

export function silentExecOrFail(cmd: string, ...args: string[]) {
  return _exec({ silent: true }, cmd, args);
}

export function ng(...args: string[]) {
  return _exec({}, 'ng', args);
}

export function silentNg(...args: string[]) {
  return _exec({ silent: true }, 'ng', args);
}

export function npm(...args: string[]) {
  return _exec({}, 'npm', args);
}

export function git(...args: string[]) {
  return _exec({}, 'git', args);
}
