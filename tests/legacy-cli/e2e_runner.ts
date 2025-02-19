import { parseArgs } from 'node:util';
import { createConsoleLogger } from '../../packages/angular_devkit/core/node';
import colors from 'ansi-colors';
import glob from 'fast-glob';
import * as path from 'node:path';
import { getGlobalVariable, registryAddr, setGlobalVariable } from './e2e/utils/env';
import { gitClean } from './e2e/utils/git';
import { createNpmRegistry } from './e2e/utils/registry';
import { launchTestProcess } from './e2e/utils/process';
import { delimiter, dirname, join } from 'node:path';
import { findFreePort } from './e2e/utils/network';
import { extractFile } from './e2e/utils/tar';
import { realpathSync } from 'node:fs';
import { PkgInfo } from './e2e/utils/packages';
import { isWindowsTestMode } from './e2e/utils/wsl';

Error.stackTraceLimit = Infinity;

// tslint:disable:no-global-tslint-disable no-console

/**
 * Here's a short description of those flags:
 *   --debug           If a test fails, block the thread so the temporary directory isn't deleted.
 *   --noproject       Skip creating a project or using one.
 *   --noglobal        Skip linking your local @angular/cli directory. Can save a few seconds.
 *   --nosilent        Never silence ng commands.
 *   --ng-tag=TAG      Use a specific tag for build snapshots. Similar to ng-snapshots but point to a
 *                     tag instead of using the latest `main`.
 *   --ng-snapshots    Install angular snapshot builds in the test project.
 *   --glob            Run tests matching this glob pattern (relative to tests/e2e/).
 *   --ignore          Ignore tests matching this glob pattern.
 *   --reuse=/path     Use a path instead of create a new project. That project should have been
 *                     created, and npm installed. Ideally you want a project created by a previous
 *                     run of e2e.
 *   --nb-shards       Total number of shards that this is part of. Default is 2 if --shard is
 *                     passed in.
 *   --shard           Index of this processes' shard.
 *   --tmpdir=path     Override temporary directory to use for new projects.
 *   --package-manager Package manager to use.
 *   --package=path    An npm package to be published before running tests
 *
 * If unnamed flags are passed in, the list of tests will be filtered to include only those passed.
 */
const parsed = parseArgs({
  allowPositionals: true,
  options: {
    'debug': { type: 'boolean', default: !!process.env.BUILD_WORKSPACE_DIRECTORY },
    'esbuild': { type: 'boolean' },
    'glob': { type: 'string', default: process.env.TESTBRIDGE_TEST_ONLY },
    'ignore': { type: 'string', multiple: true },
    'ng-snapshots': { type: 'boolean' },
    'ng-tag': { type: 'string' },
    'ng-version': { type: 'string' },
    'noglobal': { type: 'boolean' },
    'noproject': { type: 'boolean' },
    'nosilent': { type: 'boolean' },
    'package': { type: 'string', multiple: true, default: ['./dist/_*.tgz'] },
    'package-manager': { type: 'string', default: 'npm' },
    'reuse': { type: 'string' },
    'tmpdir': { type: 'string' },
    'verbose': { type: 'boolean' },

    'nb-shards': { type: 'string' },
    'shard': { type: 'string' },
  },
});

const argv = {
  ...parsed.values,
  _: parsed.positionals,
  'nb-shards':
    parsed.values['nb-shards'] ??
    (Number(process.env.E2E_SHARD_TOTAL ?? 1) * Number(process.env.TEST_TOTAL_SHARDS ?? 1) || 1),
  shard:
    parsed.values.shard ??
    (process.env.E2E_SHARD_INDEX === undefined && process.env.TEST_SHARD_INDEX === undefined
      ? undefined
      : Number(process.env.E2E_SHARD_INDEX ?? 0) * Number(process.env.TEST_TOTAL_SHARDS ?? 1) +
        Number(process.env.TEST_SHARD_INDEX ?? 0)),
};

/**
 * Set the error code of the process to 255.  This is to ensure that if something forces node
 * to exit without finishing properly, the error code will be 255. Right now that code is not used.
 *
 * - 1 When tests succeed we already call `process.exit(0)`, so this doesn't change any correct
 * behaviour.
 *
 * One such case that would force node <= v6 to exit with code 0, is a Promise that doesn't resolve.
 */
process.exitCode = 255;

/**
 * Mark this process as the main e2e_runner
 */
process.env.LEGACY_CLI_RUNNER = '1';

/**
 * Add external git toolchain onto PATH
 */
if (process.env.GIT_BIN) {
  process.env.PATH = process.env.PATH! + delimiter + dirname(process.env.GIT_BIN!);
}

/**
 * Add external browser toolchains onto PATH
 */
if (process.env.CHROME_BIN) {
  process.env.PATH = process.env.PATH! + delimiter + dirname(process.env.CHROME_BIN!);
}

const logger = createConsoleLogger(argv.verbose, process.stdout, process.stderr, {
  info: (s) => s,
  debug: (s) => s,
  warn: (s) => colors.bold.yellow(s),
  error: (s) => colors.bold.red(s),
  fatal: (s) => colors.bold.red(s),
});

const logStack = [logger];
function lastLogger() {
  return logStack[logStack.length - 1];
}

// Under bazel the compiled file (.js) and types (.d.ts) are available.
const SRC_FILE_EXT_RE = /\.js$/;
const testGlob = argv.glob?.replace(/\.ts$/, '.js') || `tests/**/*.js`;

const e2eRoot = path.join(__dirname, 'e2e');
const allSetups = glob.sync(`setup/**/*.js`, { cwd: e2eRoot }).sort();
const allInitializers = glob.sync(`initialize/**/*.js`, { cwd: e2eRoot }).sort();

const allTests = glob
  .sync(testGlob, { cwd: e2eRoot, ignore: argv.ignore })
  // Replace windows slashes.
  .map((name) => name.replace(/\\/g, '/'))
  .filter((name) => {
    if (name.endsWith('/setup.js')) {
      return false;
    }
    if (!SRC_FILE_EXT_RE.test(name)) {
      return false;
    }

    // The below is to exclude specific tests that are not intented to run for the current package manager.
    // This is also important as without the trickery the tests that take the longest ex: update.ts (2.5mins)
    // will be executed on the same shard.
    const fileName = path.basename(name);
    if (
      (fileName.startsWith('yarn-') && argv['package-manager'] !== 'yarn') ||
      (fileName.startsWith('npm-') && argv['package-manager'] !== 'npm')
    ) {
      return false;
    }

    return true;
  })
  .sort();

const shardId = argv['shard'] !== undefined ? Number(argv['shard']) : null;
const nbShards = shardId === null ? 1 : Number(argv['nb-shards']);
const tests = allTests.filter((name) => {
  // Check for naming tests on command line.
  if (argv._.length == 0) {
    return true;
  }

  return argv._.some((argName) => {
    return (
      path.join(process.cwd(), argName + '') == path.join(__dirname, 'e2e', name) ||
      argName == name ||
      argName == name.replace(SRC_FILE_EXT_RE, '')
    );
  });
});

// Remove tests that are not part of this shard.
const testsToRun = tests.filter((name, i) => shardId === null || i % nbShards == shardId);

if (testsToRun.length === 0) {
  if (shardId !== null && tests.length <= shardId) {
    console.log(`No tests to run on shard ${shardId}, exiting.`);
    process.exit(0);
  } else {
    console.log(`No tests would be ran, aborting.`);
    process.exit(1);
  }
}

if (shardId !== null) {
  console.log(`Running shard ${shardId} of ${nbShards}`);
}

/**
 * Load all the files from the e2e, filter and sort them and build a promise of their default
 * export.
 */
if (testsToRun.length == allTests.length) {
  console.log(`Running ${testsToRun.length} tests`);
} else {
  console.log(`Running ${testsToRun.length} tests (${allTests.length} total)`);
}

console.log(['Tests:', ...testsToRun].join('\n '));

setGlobalVariable('argv', argv);
setGlobalVariable('package-manager', argv['package-manager']);
setGlobalVariable('bazel-test-working-dir', process.cwd());

const windowsMode = isWindowsTestMode();

// Use the chrome supplied by bazel or the puppeteer chrome and webdriver-manager driver outside.
// This is needed by karma-chrome-launcher, protractor etc.
// https://github.com/karma-runner/karma-chrome-launcher#headless-chromium-with-puppeteer
//
// Resolve from relative paths to absolute paths within the bazel runfiles tree
// so subprocesses spawned in a different working directory can still find them.
process.env.CHROME_BIN = windowsMode?.windowsChromiumPath ?? path.resolve(process.env.CHROME_BIN!);
process.env.CHROME_PATH =
  windowsMode?.windowsChromiumPath ?? path.resolve(process.env.CHROME_PATH!);
process.env.CHROMEDRIVER_BIN =
  windowsMode?.windowsChromedriverPath ?? path.resolve(process.env.CHROMEDRIVER_BIN!);

// Find free ports sequentially, reducing the risk of collisions.
// Note for Windows test mode on CI: Verdaccio runs inside WSL, so we
// never want to reserve a port in the Windows host.
const ports = (async () => {
  const portA = await findFreePort({ neverRunOnWslHost: true });
  const portB = await findFreePort({ neverRunOnWslHost: true });
  return [portA, portB];
})();

Promise.all([ports, findPackageTars()])
  .then(async ([[httpPort, httpsPort], packageTars]) => {
    setGlobalVariable('package-registry', `http://${registryAddr}:${httpPort}`);
    setGlobalVariable('package-secure-registry', `http://${registryAddr}:${httpsPort}`);
    setGlobalVariable('package-tars', packageTars);

    // NPM registries for the lifetime of the test execution
    const registryProcess = await createNpmRegistry(httpPort, httpPort);
    const secureRegistryProcess = await createNpmRegistry(httpPort, httpsPort, true);

    try {
      await runSteps(runSetup, allSetups, 'setup');
      await runSteps(runInitializer, allInitializers, 'initializer');
      await runSteps(runTest, testsToRun, 'test');

      if (shardId !== null) {
        console.log(colors.green(`Done shard ${shardId} of ${nbShards}.`));
      } else {
        console.log(colors.green('Done.'));
      }

      process.exitCode = 0;
    } catch (err) {
      if (err instanceof Error) {
        console.log('\n');
        console.error(colors.red(err.message));
        if (err.stack) {
          console.error(colors.red(err.stack));
        }
      } else {
        console.error(colors.red(String(err)));
      }

      if (argv.debug) {
        console.log(`Current Directory: ${process.cwd()}`);
        console.log('Will loop forever while you debug... CTRL-C to quit.');

        /* eslint-disable no-constant-condition */
        while (1) {
          // That's right!
        }
      }

      process.exitCode = 1;
    } finally {
      registryProcess.kill();
      secureRegistryProcess.kill();
    }
  })
  .catch((err) => {
    console.error(colors.red(`Unkown Error: ${err}`));
    process.exitCode = 1;
  });

async function runSteps(
  run: (name: string) => Promise<void> | void,
  steps: string[],
  type: 'setup' | 'test' | 'initializer',
) {
  const capsType = type[0].toUpperCase() + type.slice(1);

  for (const [stepIndex, relativeName] of steps.entries()) {
    // Make sure this is a windows compatible path.
    let absoluteName = path.join(e2eRoot, relativeName).replace(SRC_FILE_EXT_RE, '');
    if (/^win/.test(process.platform)) {
      absoluteName = absoluteName.replace(/\\/g, path.posix.sep);
    }

    const name = relativeName.replace(SRC_FILE_EXT_RE, '');
    const start = Date.now();

    printHeader(name, stepIndex, steps.length, type);

    // Run the test function with the current file on the logStack.
    logStack.push(lastLogger().createChild(absoluteName));
    try {
      await run(absoluteName);
    } catch (e) {
      console.log('\n');
      console.error(colors.red(`${capsType} "${name}" failed...`));

      throw e;
    } finally {
      logStack.pop();
    }

    console.log('----');
    printFooter(name, type, start);
  }
}

function runSetup(absoluteName: string): Promise<void> {
  const module = require(absoluteName);

  return (typeof module === 'function' ? module : module.default)();
}

/**
 * Run a file from the projects root directory in a subprocess via launchTestProcess().
 */
function runInitializer(absoluteName: string): Promise<void> {
  process.chdir(getGlobalVariable('projects-root'));

  return launchTestProcess(absoluteName);
}

/**
 * Run a file from the main 'test-project' directory in a subprocess via launchTestProcess().
 */
async function runTest(absoluteName: string): Promise<void> {
  process.chdir(join(getGlobalVariable('projects-root'), 'test-project'));

  await launchTestProcess(absoluteName);
  await gitClean();
}

function printHeader(
  testName: string,
  testIndex: number,
  count: number,
  type: 'setup' | 'initializer' | 'test',
) {
  const text = `${testIndex + 1} of ${count}`;
  const fullIndex = testIndex * nbShards + (shardId ?? 0) + 1;
  const shard =
    shardId === null || type !== 'test'
      ? ''
      : colors.yellow(` [${shardId}:${nbShards}]` + colors.bold(` (${fullIndex}/${tests.length})`));
  console.log(
    colors.green(
      `Running ${type} "${colors.bold.blue(testName)}" (${colors.bold.white(text)}${shard})...`,
    ),
  );
}

function printFooter(testName: string, type: 'setup' | 'initializer' | 'test', startTime: number) {
  const capsType = type[0].toUpperCase() + type.slice(1);

  // Round to hundredth of a second.
  const t = Math.round((Date.now() - startTime) / 10) / 100;
  console.log(
    colors.green(`${capsType} "${colors.bold.blue(testName)}" took `) +
      colors.bold.blue('' + t) +
      colors.green('s...'),
  );
  console.log('');
}

// Collect the packages passed as arguments and return as {package-name => pkg-path}
async function findPackageTars(): Promise<{ [pkg: string]: PkgInfo }> {
  const pkgs: string[] = (getGlobalVariable('argv').package as string[]).flatMap((p) =>
    glob.sync(p),
  );

  const pkgJsons = await Promise.all(
    pkgs.map((pkg) => realpathSync(pkg)).map((pkg) => extractFile(pkg, './package.json')),
  );

  return pkgs.reduce(
    (all, pkg, i) => {
      const json = pkgJsons[i].toString('utf8');
      const { name, version } = JSON.parse(json) as { name: string; version: string };
      if (!name) {
        throw new Error(`Package ${pkg} - package.json name/version not found`);
      }

      all[name] = { path: realpathSync(pkg), name, version };
      return all;
    },
    {} as { [pkg: string]: PkgInfo },
  );
}
