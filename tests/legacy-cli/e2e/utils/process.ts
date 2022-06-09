import * as ansiColors from 'ansi-colors';
import { SpawnOptions } from 'child_process';
import * as child_process from 'child_process';
import { concat, defer, EMPTY, from } from 'rxjs';
import { repeat, takeLast } from 'rxjs/operators';
import { getGlobalVariable, getGlobalVariablesEnv } from './env';
import { catchError } from 'rxjs/operators';
import treeKill from 'tree-kill';
import { delimiter, join, resolve } from 'path';

interface ExecOptions {
  silent?: boolean;
  waitForMatch?: RegExp;
  env?: NodeJS.ProcessEnv;
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
  childProcess.stdout!.on('data', (data: Buffer) => {
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

  childProcess.stderr!.on('data', (data: Buffer) => {
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

      childProcess.stdout!.on('data', (data: Buffer) => {
        if (data.toString().match(match)) {
          resolve({ stdout, stderr });
          matched = true;
        }
      });

      childProcess.stderr!.on('data', (data: Buffer) => {
        if (data.toString().match(match)) {
          resolve({ stdout, stderr });
          matched = true;
        }
      });
    }

    // Provide input to stdin if given.
    if (options.stdin) {
      childProcess.stdin!.write(options.stdin);
      childProcess.stdin!.end();
    }
  });
}

export function extractNpmEnv() {
  return Object.keys(process.env)
    .filter((v) => NPM_CONFIG_RE.test(v))
    .reduce<NodeJS.ProcessEnv>(
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

        childProcess.stdout!.on('data', (data: Buffer) => {
          stdout += data.toString();
          if (data.toString().match(match)) {
            resolve({ stdout, stderr });
          }
        });

        childProcess.stderr!.on('data', (data: Buffer) => {
          stderr += data.toString();
          if (data.toString().match(match)) {
            resolve({ stdout, stderr });
          }
        });
      }),
  );

  return Promise.race(matchPromises.concat([timeoutPromise]));
}

export async function killAllProcesses(signal = 'SIGTERM'): Promise<void> {
  const processesToKill: Promise<void>[] = [];

  while (_processes.length) {
    const childProc = _processes.pop();
    if (!childProc) {
      continue;
    }

    processesToKill.push(
      new Promise<void>((resolve) => {
        treeKill(childProc.pid, signal, () => {
          // Ignore all errors.
          // This is due to a race condition with the `waitForMatch` logic.
          // where promises are resolved on matches and not when the process terminates.
          // Also in some cases in windows we get `The operation attempted is not supported`.
          resolve();
        });
      }),
    );
  }

  await Promise.all(processesToKill);
}

export function exec(cmd: string, ...args: string[]) {
  return _exec({}, cmd, args);
}

export function silentExec(cmd: string, ...args: string[]) {
  return _exec({ silent: true }, cmd, args);
}

export function execWithEnv(cmd: string, args: string[], env: NodeJS.ProcessEnv, stdin?: string) {
  return _exec({ env, stdin }, cmd, args);
}

export async function execAndCaptureError(
  cmd: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
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
  env?: NodeJS.ProcessEnv,
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
      },
      'npm',
      params,
    );
  } else {
    return _exec({ silent: true }, 'npm', args as string[]);
  }
}

export function silentYarn(...args: string[]) {
  return _exec({ silent: true }, 'yarn', args);
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
  return _exec({ silent: true }, 'git', args);
}

/**
 * Launch the given entry in an child process isolated to the test environment.
 *
 * The test environment includes the local NPM registry, isolated NPM globals,
 * the PATH variable only referencing the local node_modules and local NPM
 * registry (not the test runner or standard global node_modules).
 */
export async function launchTestProcess(entry: string, ...args: any[]) {
  const tempRoot: string = getGlobalVariable('tmp-root');

  // Extract explicit environment variables for the test process.
  const env: NodeJS.ProcessEnv = {
    ...extractNpmEnv(),
    ...getGlobalVariablesEnv(),
  };

  // Modify the PATH environment variable...
  let paths = process.env.PATH!.split(delimiter);

  // Only include paths within the sandboxed test environment or external
  // non angular-cli paths such as /usr/bin for generic commands.
  paths = paths.filter((p) => p.startsWith(tempRoot) || !p.includes('angular-cli'));

  // Ensure the custom npm global bin is on the PATH
  // https://docs.npmjs.com/cli/v8/configuring-npm/folders#executables
  if (process.platform.startsWith('win')) {
    paths.unshift(env.NPM_CONFIG_PREFIX!);
  } else {
    paths.unshift(join(env.NPM_CONFIG_PREFIX!, 'bin'));
  }

  env.PATH = paths.join(delimiter);

  return _exec({ env }, process.execPath, [resolve(__dirname, 'run_test_process'), entry, ...args]);
}
