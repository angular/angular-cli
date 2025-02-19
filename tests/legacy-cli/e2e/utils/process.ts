import * as ansiColors from 'ansi-colors';
import { spawn, SpawnOptions } from 'node:child_process';
import * as child_process from 'node:child_process';
import { concat, defer, EMPTY, from, lastValueFrom, catchError, repeat } from 'rxjs';
import { getGlobalVariable, getGlobalVariablesEnv } from './env';
import treeKill from 'tree-kill';
import { delimiter, join, resolve } from 'node:path';
import { createWslEnv, interopWslPathForOutsideIfNecessary, isWindowsTestMode } from './wsl';

interface ExecOptions {
  silent?: boolean;
  waitForMatch?: RegExp;
  env?: NodeJS.ProcessEnv;
  stdin?: string;
  cwd?: string;
}

/**
 * While `NPM_CONFIG_` and `YARN_` are case insensitive we filter based on case.
 * This is because when invoking a command using `yarn` it will add a bunch of these variables in lower case.
 * This causes problems when we try to update the variables during the test setup.
 */
const NPM_CONFIG_RE = /^(NPM_CONFIG_|YARN_|NO_UPDATE_NOTIFIER)/;

let _processes: child_process.ChildProcess[] = [];

export type ProcessOutput = {
  stdout: string;
  stderr: string;
};

function _exec(options: ExecOptions, cmd: string, args: string[]): Promise<ProcessOutput> {
  // Create a separate instance to prevent unintended global changes to the color configuration
  const colors = ansiColors.create();

  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const windowsMode = isWindowsTestMode();

  console.log(
    `==========================================================================================`,
  );

  // Ensure the custom npm and yarn global bin is on the PATH
  // https://docs.npmjs.com/cli/v8/configuring-npm/folders#executables.
  // On Linux, macOS platforms, `bin/` is needed.
  const paths = [
    join(getGlobalVariable('yarn-global'), windowsMode === null ? 'bin' : ''),
    join(getGlobalVariable('npm-global'), windowsMode === null ? 'bin' : ''),
    env.PATH || process.env['PATH'],
  ].join(delimiter);

  args = args.filter((x) => x !== undefined);
  const flags = [
    options.silent && 'silent',
    options.waitForMatch && `matching(${options.waitForMatch})`,
  ]
    .filter((x) => !!x) // Remove false and undefined.
    .join(', ')
    .replace(/^(.+)$/, ' [$1]'); // Proper formatting.

  const spawnOptions: SpawnOptions & Required<Pick<SpawnOptions, 'env'>> = {
    cwd,
    env: { ...env, PATH: paths },
  };

  // Set by jobs running the e2e runner inside WSL, but want to verify CLI
  // works well for our Windows users outside of WSL. See `.github/workflows/pr.yml`.
  if (windowsMode !== null) {
    // Translate command path to a native Windows path, as we execute
    // via CMD outside WSL.
    args.unshift('/c', cmd);
    cmd = windowsMode.cmdPath;

    spawnOptions.stdio = 'pipe';
    // Set WSLENV to propagate configured environment variables.
    // E.g. NPM registry or other variables.
    spawnOptions.env['WSLENV'] = createWslEnv(spawnOptions.env);

    // Convert all absolute paths to native Windows paths that are
    // valid in CMD outside WSL. Relative imports should still work.
    // Absolute paths will otherwise be invalid when simulating commands
    // for native Windows users.
    for (let i = 0; i < args.length; i++) {
      args[i] = interopWslPathForOutsideIfNecessary(args[i]);
    }
  }

  console.log(colors.blue(`Running \`${cmd} ${args.map((x) => `"${x}"`).join(' ')}\`${flags}...`));
  console.log(colors.blue(`CWD: ${cwd}`));

  const childProcess = child_process.spawn(cmd, args, spawnOptions);

  _processes.push(childProcess);

  // Create the error here so the stack shows who called this function.
  const error = new Error();

  const processPromise = new Promise<ProcessOutput>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let matched = false;

    // Return log info about the current process status
    function envDump() {
      return `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
    }

    childProcess.stdout!.on('data', (data: Buffer) => {
      stdout += data.toString('utf-8');

      if (options.waitForMatch && stdout.match(options.waitForMatch)) {
        resolve({ stdout, stderr });
        matched = true;
      }

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

      if (options.waitForMatch && stderr.match(options.waitForMatch)) {
        resolve({ stdout, stderr });
        matched = true;
      }

      if (options.silent) {
        return;
      }

      data
        .toString('utf-8')
        .split(/[\n\r]+/)
        .filter((line) => line !== '')
        .forEach((line) => console.error(colors.yellow('  ' + line)));
    });

    childProcess.on('close', (code) => {
      _processes = _processes.filter((p) => p !== childProcess);

      if (options.waitForMatch && !matched) {
        reject(
          `Process output didn't match - "${cmd} ${args.join(' ')}": '${
            options.waitForMatch
          }': ${code}...\n\n${envDump()}\n`,
        );
        return;
      }

      if (!code) {
        resolve({ stdout, stderr });
        return;
      }

      reject(`Process exit error - "${cmd} ${args.join(' ')}": Code: ${code}\n\n${envDump()}\n`);
    });

    childProcess.on('error', (err) => {
      reject(`Process error - "${cmd} ${args.join(' ')}": ${err}\n\n${envDump()}\n`);
    });

    // Provide input to stdin if given.
    if (options.stdin) {
      childProcess.stdin!.write(options.stdin);
      childProcess.stdin!.end();
    }
  }).catch((err) => {
    error.message = err.toString();
    return Promise.reject(error);
  });

  if (!options.waitForMatch) {
    return processPromise;
  }

  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise: Promise<never> = new Promise((_resolve, reject) => {
    // Wait for 60 seconds and timeout.
    const duration = 60_000;
    timeout = setTimeout(() => {
      reject(
        new Error(`Waiting for ${options.waitForMatch} timed out (timeout: ${duration}msec)...`),
      );
    }, duration);
  });

  return Promise.race([timeoutPromise, processPromise]).finally(
    () => timeout && clearTimeout(timeout),
  );
}

export function extractNpmEnv() {
  return Object.keys(process.env)
    .filter((v) => NPM_CONFIG_RE.test(v))
    .reduce<NodeJS.ProcessEnv>((vars, n) => {
      vars[n] = process.env[n];
      return vars;
    }, {});
}

function extractCIEnv(): NodeJS.ProcessEnv {
  return Object.keys(process.env)
    .filter(
      (v) =>
        v.startsWith('SAUCE_') ||
        v === 'CI' ||
        v === 'CIRCLECI' ||
        v === 'CHROME_BIN' ||
        v === 'CHROME_PATH' ||
        v === 'CHROMEDRIVER_BIN',
    )
    .reduce<NodeJS.ProcessEnv>((vars, n) => {
      vars[n] = process.env[n];
      return vars;
    }, {});
}

function extractNgEnv() {
  return Object.keys(process.env)
    .filter((v) => v.startsWith('NG_'))
    .reduce<NodeJS.ProcessEnv>((vars, n) => {
      vars[n] = process.env[n];
      return vars;
    }, {});
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
          if (stdout.match(match)) {
            resolve({ stdout, stderr });
          }
        });

        childProcess.stderr!.on('data', (data: Buffer) => {
          stderr += data.toString();
          if (stderr.match(match)) {
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
    if (!childProc || childProc.pid === undefined) {
      continue;
    }

    processesToKill.push(
      new Promise<void>((resolve) => {
        treeKill(childProc.pid!, signal, () => {
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
    if (err instanceof Error) {
      return err;
    }
    throw new Error('Subprocess exception was not an Error instance');
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
    return lastValueFrom(
      concat(
        from(_exec({ waitForMatch: match, env }, cmd, args)),
        defer(() => waitForAnyProcessOutputToMatch(match, 2500)).pipe(
          repeat(20),
          catchError(() => EMPTY),
        ),
      ),
    );
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

export function silentPnpm(...args: string[]) {
  return _exec({ silent: true }, 'pnpm', args);
}

export function silentBun(...args: string[]) {
  return _exec({ silent: true }, 'bun', args);
}

export function globalNpm(args: string[], env?: NodeJS.ProcessEnv) {
  if (!process.env.LEGACY_CLI_RUNNER) {
    throw new Error(
      'The global npm cli should only be executed from the primary e2e runner process',
    );
  }

  const windowsMode = isWindowsTestMode();
  if (windowsMode) {
    return _exec({ silent: true, env }, windowsMode.npmBinaryForWindowsPath, args);
  }

  return _spawnNode([require.resolve('npm'), ...args], { silent: true, env });
}

export function node(...args: string[]) {
  return _spawnNode(args);
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
export async function launchTestProcess(entry: string, ...args: any[]): Promise<void> {
  // NOTE: do NOT use the bazel TEST_TMPDIR. When sandboxing is not enabled the
  // TEST_TMPDIR is not sandboxed and has symlinks into the src dir in a
  // parent directory. Symlinks into the src dir will include package.json,
  // .git and other files/folders that may effect e2e tests.

  const tempRoot: string = getGlobalVariable('tmp-root');
  const TEMP = process.env.TEMP ?? process.env.TMPDIR ?? tempRoot;

  // Extract explicit environment variables for the test process.
  const env: NodeJS.ProcessEnv = {
    TEMP,
    TMPDIR: TEMP,
    HOME: TEMP,

    // Use BAZEL_TARGET as a metadata variable to show it is a
    // process managed by bazel
    BAZEL_TARGET: process.env.BAZEL_TARGET,

    ...extractNpmEnv(),
    ...extractCIEnv(),
    ...extractNgEnv(),
    ...getGlobalVariablesEnv(),
  };

  // Only include paths within the sandboxed test environment or external
  // non angular-cli paths such as /usr/bin for generic commands.
  env.PATH = process.env
    .PATH!.split(delimiter)
    .filter((p) => p.startsWith(tempRoot) || p.startsWith(TEMP) || !p.includes('angular-cli'))
    .join(delimiter);

  const testProcessArgs = [resolve(__dirname, 'test_process'), entry, ...args];

  return new Promise<void>((resolve, reject) => {
    spawn(process.execPath, testProcessArgs, {
      stdio: 'inherit',
      env,
    })
      .on('close', (code) => {
        if (!code) {
          resolve();
          return;
        }

        reject(`Process error - "${testProcessArgs}`);
      })
      .on('error', (err) => {
        reject(`Process exit error - "${testProcessArgs}]\n\n${err}`);
      });
  });
}

function _spawnNode(args: string[], opts: ExecOptions = {}) {
  let nodeBin = process.execPath;

  const windowsMode = isWindowsTestMode();
  if (windowsMode !== null) {
    nodeBin = windowsMode.copiedWindowsBinaries.nodePath;
  }

  return _exec(opts, nodeBin, args);
}
