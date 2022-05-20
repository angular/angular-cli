import * as ansiColors from 'ansi-colors';
import { SpawnOptions } from 'child_process';
import * as child_process from 'child_process';
import { concat, defer, EMPTY, from } from 'rxjs';
import { repeat, takeLast } from 'rxjs/operators';
import { getGlobalVariable } from './env';
import { catchError } from 'rxjs/operators';
const treeKill = require('tree-kill');

interface ExecOptions {
  silent?: boolean;
  waitForMatch?: RegExp;
  env?: { [varname: string]: string };
  stdin?: string;
  cwd?: string;
}

const NPM_CONFIG_RE = /^npm_config_/i;

let _processes: child_process.ChildProcess[] = [];

export type ProcessOutput = {
  stdout: string;
  stderr: string;
};

function _exec(options: ExecOptions, cmd: string, args: string[]): Promise<ProcessOutput> {
  // Create a separate instance to prevent unintended global changes to the color configuration
  // Create function is not defined in the typings. See: https://github.com/doowb/ansi-colors/pull/44
  const colors = (ansiColors as typeof ansiColors & { create: () => typeof ansiColors }).create();

  let stdout = '';
  let stderr = '';
  const cwd = options.cwd ?? process.cwd();
  const env = options.env;
  console.log(
    `==========================================================================================`,
  );

  args = args.filter((x) => x !== undefined);
  const flags = [
    options.silent && 'silent',
    options.waitForMatch && `matching(${options.waitForMatch})`,
  ]
    .filter((x) => !!x) // Remove false and undefined.
    .join(', ')
    .replace(/^(.+)$/, ' [$1]'); // Proper formatting.

  console.log(colors.blue(`Running \`${cmd} ${args.map((x) => `"${x}"`).join(' ')}\`${flags}...`));
  console.log(colors.blue(`CWD: ${cwd}`));
  console.log(colors.blue(`ENV: ${JSON.stringify(env)}`));
  const spawnOptions: SpawnOptions = {
    cwd,
    ...(env ? { env } : {}),
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
    data
      .toString('utf-8')
      .split(/[\n\r]+/)
      .filter((line) => line !== '')
      .forEach((line) => console.log('  ' + line));
  });
  childProcess.stderr.on('data', (data: Buffer) => {
    stderr += data.toString('utf-8');
    if (options.silent) {
      return;
    }
    data
      .toString('utf-8')
      .split(/[\n\r]+/)
      .filter((line) => line !== '')
      .forEach((line) => console.error(colors.yellow('  ' + line)));
  });

  _processes.push(childProcess);

  // Create the error here so the stack shows who called this function.

  return new Promise((resolve, reject) => {
    let matched = false;

    childProcess.on('exit', (error: any) => {
      _processes = _processes.filter((p) => p !== childProcess);

      if (options.waitForMatch && !matched) {
        error = `Output didn't match '${options.waitForMatch}'.`;
      }

      if (!error) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Running "${cmd} ${args.join(
            ' ',
          )}" returned error. ${error}...\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`,
        ),
      );
    });
    childProcess.on('error', (err) => {
      err.message += `${err}...\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`;
      reject(err);
    });

    if (options.waitForMatch) {
      const match = options.waitForMatch;
      childProcess.stdout.on('data', (data: Buffer) => {
        if (data.toString().match(match)) {
          resolve({ stdout, stderr });
          matched = true;
        }
      });
      childProcess.stderr.on('data', (data: Buffer) => {
        if (data.toString().match(match)) {
          resolve({ stdout, stderr });
          matched = true;
        }
      });
    }

    // Provide input to stdin if given.
    if (options.stdin) {
      childProcess.stdin.write(options.stdin);
      childProcess.stdin.end();
    }
  });
}

export function extractNpmEnv() {
  return Object.keys(process.env)
    .filter((v) => NPM_CONFIG_RE.test(v))
    .reduce(
      (vars, n) => {
        vars[n] = process.env[n];
        return vars;
      },
      {
        PATH: process.env.PATH,
      },
    );
}

export function waitForAnyProcessOutputToMatch(
  match: RegExp,
  timeout = 30000,
): Promise<ProcessOutput> {
  // Race between _all_ processes, and the timeout. First one to resolve/reject wins.
  const timeoutPromise: Promise<ProcessOutput> = new Promise((_resolve, reject) => {
    // Wait for 30 seconds and timeout.
    setTimeout(() => {
      reject(new Error(`Waiting for ${match} timed out (timeout: ${timeout}msec)...`));
    }, timeout);
  });

  const matchPromises: Promise<ProcessOutput>[] = _processes.map(
    (childProcess) =>
      new Promise((resolve) => {
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
      }),
  );

  return Promise.race(matchPromises.concat([timeoutPromise]));
}

export function killAllProcesses(signal = 'SIGTERM') {
  _processes.forEach((process) => treeKill(process.pid, signal));
  _processes = [];
}

export function exec(cmd: string, ...args: string[]) {
  return _exec({}, cmd, args);
}

export function silentExec(cmd: string, ...args: string[]) {
  return _exec({ silent: true }, cmd, args);
}

export function execWithEnv(
  cmd: string,
  args: string[],
  env: { [varname: string]: string },
  stdin?: string,
) {
  return _exec({ env, stdin }, cmd, args);
}

export async function execAndCaptureError(
  cmd: string,
  args: string[],
  env?: { [varname: string]: string },
  stdin?: string,
): Promise<Error> {
  try {
    await _exec({ env, stdin }, cmd, args);
    throw new Error('Tried to capture subprocess exception, but it completed successfully.');
  } catch (err) {
    return err;
  }
}

export function execAndWaitForOutputToMatch(
  cmd: string,
  args: string[],
  match: RegExp,
  env?: { [varName: string]: string },
) {
  if (cmd === 'ng' && args[0] === 'serve') {
    // Accept matches up to 20 times after the initial match.
    // Useful because the Webpack watcher can rebuild a few times due to files changes that
    // happened just before the build (e.g. `git clean`).
    // This seems to be due to host file system differences, see
    // https://nodejs.org/docs/latest/api/fs.html#fs_caveats
    return concat(
      from(_exec({ waitForMatch: match, env }, cmd, args)),
      defer(() => waitForAnyProcessOutputToMatch(match, 2500)).pipe(
        repeat(20),
        catchError(() => EMPTY),
      ),
    )
      .pipe(takeLast(1))
      .toPromise();
  } else {
    return _exec({ waitForMatch: match, env }, cmd, args);
  }
}

export function ng(...args: string[]) {
  const argv = getGlobalVariable('argv');
  const maybeSilentNg = argv['nosilent'] ? noSilentNg : silentNg;
  if (['build', 'serve', 'test', 'e2e', 'extract-i18n'].indexOf(args[0]) != -1) {
    if (args[0] == 'e2e') {
      // Wait 1 second before running any end-to-end test.
      return new Promise((resolve) => setTimeout(resolve, 1000)).then(() => maybeSilentNg(...args));
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
  return _exec({ silent: true }, 'ng', args);
}

export function silentNpm(...args: string[]): Promise<ProcessOutput>;
export function silentNpm(args: string[], options?: { cwd?: string }): Promise<ProcessOutput>;
export function silentNpm(
  ...args: string[] | [args: string[], options?: { cwd?: string }]
): Promise<ProcessOutput> {
  if (Array.isArray(args[0])) {
    const [params, options] = args;
    return _exec(
      {
        silent: true,
        cwd: (options as { cwd?: string } | undefined)?.cwd,
        env: extractNpmEnv(),
      },
      'npm',
      params,
    );
  } else {
    return _exec({ silent: true, env: extractNpmEnv() }, 'npm', args as string[]);
  }
}

export function silentYarn(...args: string[]) {
  return _exec({ silent: true, env: extractNpmEnv() }, 'yarn', args);
}

export function npm(...args: string[]) {
  return _exec({ env: extractNpmEnv() }, 'npm', args);
}

export function node(...args: string[]) {
  return _exec({}, 'node', args);
}

export function git(...args: string[]) {
  return _exec({}, 'git', args);
}

export function silentGit(...args: string[]) {
  return _exec({ silent: true }, 'git', args);
}
