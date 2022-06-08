import { logging } from '../../packages/angular_devkit/core/src';
import { createConsoleLogger } from '../../packages/angular_devkit/core/node';
import * as colors from 'ansi-colors';
import glob from 'glob';
import yargsParser from 'yargs-parser';
import * as path from 'path';
import { getGlobalVariable, setGlobalVariable } from './e2e/utils/env';
import { gitClean } from './e2e/utils/git';
import { createNpmRegistry } from './e2e/utils/registry';
import { AddressInfo, createServer } from 'net';
import { launchTestProcess } from './e2e/utils/process';
import { join } from 'path';

Error.stackTraceLimit = Infinity;

// tslint:disable:no-global-tslint-disable no-console

/**
 * Here's a short description of those flags:
 *   --debug          If a test fails, block the thread so the temporary directory isn't deleted.
 *   --noproject      Skip creating a project or using one.
 *   --nobuild        Skip building the packages. Use with --noglobal and --reuse to quickly
 *                    rerun tests.
 *   --noglobal       Skip linking your local @angular/cli directory. Can save a few seconds.
 *   --nosilent       Never silence ng commands.
 *   --ng-tag=TAG     Use a specific tag for build snapshots. Similar to ng-snapshots but point to a
 *                    tag instead of using the latest `main`.
 *   --ng-snapshots   Install angular snapshot builds in the test project.
 *   --glob           Run tests matching this glob pattern (relative to tests/e2e/).
 *   --ignore         Ignore tests matching this glob pattern.
 *   --reuse=/path    Use a path instead of create a new project. That project should have been
 *                    created, and npm installed. Ideally you want a project created by a previous
 *                    run of e2e.
 *   --nb-shards      Total number of shards that this is part of. Default is 2 if --shard is
 *                    passed in.
 *   --shard          Index of this processes' shard.
 *   --devkit=path    Path to the devkit to use. The devkit will be built prior to running.
 *   --tmpdir=path    Override temporary directory to use for new projects.
 * If unnamed flags are passed in, the list of tests will be filtered to include only those passed.
 */
const argv = yargsParser(process.argv.slice(2), {
  boolean: ['debug', 'esbuild', 'ng-snapshots', 'noglobal', 'nosilent', 'noproject', 'verbose'],
  string: ['devkit', 'glob', 'ignore', 'reuse', 'ng-tag', 'tmpdir', 'ng-version'],
  configuration: {
    'dot-notation': false,
    'camel-case-expansion': false,
  },
});

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

const testGlob = argv.glob || 'tests/**/*.ts';

const e2eRoot = path.join(__dirname, 'e2e');
const allSetups = glob.sync('setup/**/*.ts', { nodir: true, cwd: e2eRoot }).sort();
const allInitializers = glob.sync('initialize/**/*.ts', { nodir: true, cwd: e2eRoot }).sort();
const allTests = glob
  .sync(testGlob, { nodir: true, cwd: e2eRoot, ignore: argv.ignore })
  // Replace windows slashes.
  .map((name) => name.replace(/\\/g, '/'))
  .sort()
  .filter((name) => !name.endsWith('/setup.ts'));

const shardId = 'shard' in argv ? argv['shard'] : null;
const nbShards = (shardId === null ? 1 : argv['nb-shards']) || 2;
const tests = allTests.filter((name) => {
  // Check for naming tests on command line.
  if (argv._.length == 0) {
    return true;
  }

  return argv._.some((argName) => {
    return (
      path.join(process.cwd(), argName + '') == path.join(__dirname, 'e2e', name) ||
      argName == name ||
      argName == name.replace(/\.ts$/, '')
    );
  });
});

// Remove tests that are not part of this shard.
const testsToRun = tests.filter((name, i) => shardId === null || i % nbShards == shardId);

if (testsToRun.length === 0) {
  console.log(`No tests would be ran, aborting.`);
  process.exit(1);
}

console.log(testsToRun.join('\n'));
/**
 * Load all the files from the e2e, filter and sort them and build a promise of their default
 * export.
 */
if (testsToRun.length == allTests.length) {
  console.log(`Running ${testsToRun.length} tests`);
} else {
  console.log(`Running ${testsToRun.length} tests (${allTests.length} total)`);
}

setGlobalVariable('argv', argv);
setGlobalVariable('ci', process.env['CI']?.toLowerCase() === 'true' || process.env['CI'] === '1');
setGlobalVariable('package-manager', argv.yarn ? 'yarn' : 'npm');

Promise.all([findFreePort(), findFreePort()])
  .then(async ([httpPort, httpsPort]) => {
    setGlobalVariable('package-registry', 'http://localhost:' + httpPort);
    setGlobalVariable('package-secure-registry', 'http://localhost:' + httpsPort);

    // NPM registries for the lifetime of the test execution
    const registryProcess = await createNpmRegistry(httpPort, httpPort);
    const secureRegistryProcess = await createNpmRegistry(httpPort, httpsPort, true);

    try {
      await runSteps(runSetup, allSetups, 'setup');
      await runSteps(runInitializer, allInitializers, 'initializer');
      await runSteps(runTest, testsToRun, 'test');

      console.log(colors.green('Done.'));
    } catch (err) {
      console.log('\n');
      console.error(colors.red(err.message));
      console.error(colors.red(err.stack));

      if (argv.debug) {
        console.log(`Current Directory: ${process.cwd()}`);
        console.log('Will loop forever while you debug... CTRL-C to quit.');

        /* eslint-disable no-constant-condition */
        while (1) {
          // That's right!
        }
      }

      throw err;
    } finally {
      registryProcess.kill();
      secureRegistryProcess.kill();
    }
  })
  .then(
    () => process.exit(0),
    () => process.exit(1),
  );

async function runSteps(
  run: (name: string) => Promise<void> | void,
  steps: string[],
  type: 'setup' | 'test' | 'initializer',
) {
  for (const [stepIndex, relativeName] of steps.entries()) {
    // Make sure this is a windows compatible path.
    let absoluteName = path.join(e2eRoot, relativeName).replace(/\.ts$/, '');
    if (/^win/.test(process.platform)) {
      absoluteName = absoluteName.replace(/\\/g, path.posix.sep);
    }

    const name = relativeName.replace(/\.ts$/, '');
    const start = Date.now();

    printHeader(relativeName, stepIndex, steps.length, type);

    // Run the test function with the current file on the logStack.
    logStack.push(lastLogger().createChild(absoluteName));
    try {
      await run(absoluteName);
    } catch (e) {
      console.log('\n');
      console.error(colors.red(`Step "${absoluteName}" failed...`));
      throw e;
    } finally {
      logStack.pop();
    }

    console.log('----');
    printFooter(name, type, start);
  }
}

async function runSetup(absoluteName: string) {
  const module = require(absoluteName);

  await (typeof module === 'function' ? module : module.default)();
}

/**
 * Run a file from the projects root directory in a subprocess via launchTestProcess().
 */
async function runInitializer(absoluteName: string) {
  process.chdir(getGlobalVariable('projects-root'));

  await launchTestProcess(absoluteName);
}

/**
 * Run a file from the main 'test-project' directory in a subprocess via launchTestProcess().
 */
async function runTest(absoluteName: string) {
  process.chdir(join(getGlobalVariable('projects-root'), 'test-project'));

  await launchTestProcess(absoluteName);

  logStack.push(new logging.NullLogger());
  try {
    await gitClean();
  } finally {
    logStack.pop();
  }
}

function printHeader(
  testName: string,
  testIndex: number,
  count: number,
  type: 'setup' | 'initializer' | 'test',
) {
  const text = `${testIndex + 1} of ${count}`;
  const fullIndex = testIndex * nbShards + shardId + 1;
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
  // Round to hundredth of a second.
  const t = Math.round((Date.now() - startTime) / 10) / 100;
  console.log(colors.green(`Last ${type} took `) + colors.bold.blue('' + t) + colors.green('s...'));
  console.log('');
}

function findFreePort() {
  return new Promise<number>((resolve, reject) => {
    const srv = createServer();
    srv.once('listening', () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close((e) => (e ? reject(e) : resolve(port)));
    });
    srv.once('error', (e) => srv.close(() => reject(e)));
    srv.listen();
  });
}
