// This may seem awkward but we're using Logger in our e2e. At this point the unit tests
// have run already so it should be "safe", teehee.
import { logging, terminal } from '@angular-devkit/core';
import { createConsoleLogger } from '@angular-devkit/core/node';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as glob from 'glob';
import * as minimist from 'minimist';
import * as os from 'os';
import * as path from 'path';
import { setGlobalVariable } from './e2e/utils/env';
import { gitClean } from './e2e/utils/git';

const { blue, bold, green, red, yellow, white } = terminal;

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
 *                    tag instead of using the latest master.
 *   --ng-snapshots   Install angular snapshot builds in the test project.
 *   --ve             Use the View Engine compiler.
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
const argv = minimist(process.argv.slice(2), {
  boolean: ['debug', 'ng-snapshots', 'noglobal', 'nosilent', 'noproject', 'verbose', 've'],
  string: ['devkit', 'glob', 'ignore', 'reuse', 'ng-tag', 'tmpdir', 'ng-version'],
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

const logger = createConsoleLogger(argv.verbose);
const logStack = [logger];
function lastLogger() {
  return logStack[logStack.length - 1];
}

const testGlob = argv.glob || 'tests/**/*.ts';
let currentFileName = null;

const e2eRoot = path.join(__dirname, 'e2e');
const allSetups = glob
  .sync(path.join(e2eRoot, 'setup/**/*.ts'), { nodir: true })
  .map(name => path.relative(e2eRoot, name))
  .sort();
let allTests = glob
  .sync(path.join(e2eRoot, testGlob), { nodir: true, ignore: argv.ignore })
  .map(name => path.relative(e2eRoot, name))
  // Replace windows slashes.
  .map(name => name.replace(/\\/g, '/'))
  .sort();

// TODO: either update or remove these tests.
allTests = allTests
  // IS this test still valid? \/
  .filter(name => !name.endsWith('/module-id.ts'))
  // Do we want to support this?
  .filter(name => !name.endsWith('different-file-format.ts'))
  // Not sure what this test is meant to test, but with depedency changes it is not valid anymore.
  .filter(name => !name.endsWith('loaders-resolution.ts'))
  // NEW COMMAND
  .filter(name => !name.includes('tests/commands/new/'))
  // NEEDS devkit change
  .filter(name => !name.endsWith('/existing-directory.ts'))
  // Disabled on rc.0 due to needed sync with devkit for changes.
  .filter(name => !name.endsWith('/service-worker.ts'));

if (!argv.ve) {
  // These tests are disabled on the Ivy CI jobs because:
  // - Ivy doesn't support the functionality yet
  // - The test itself is not applicable to Ivy
  // As we transition into using Ivy as the default this list should be reassessed.
  allTests = allTests
    // Ivy doesn't support i18n externally at the moment.
    .filter(name => !name.includes('tests/i18n/'))
    .filter(name => !name.endsWith('tests/build/aot/aot-i18n.ts'))
}

const shardId = 'shard' in argv ? argv['shard'] : null;
const nbShards = (shardId === null ? 1 : argv['nb-shards']) || 2;
const tests = allTests.filter(name => {
  // Check for naming tests on command line.
  if (argv._.length == 0) {
    return true;
  }

  return argv._.some(argName => {
    return (
      path.join(process.cwd(), argName) == path.join(__dirname, 'e2e', name) ||
      argName == name ||
      argName == name.replace(/\.ts$/, '')
    );
  });
});

// Remove tests that are not part of this shard.
const shardedTests = tests.filter((name, i) => shardId === null || i % nbShards == shardId);
const testsToRun = allSetups.concat(shardedTests);

if (shardedTests.length === 0) {
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
  console.log(`Running ${testsToRun.length} tests (${allTests.length + allSetups.length} total)`);
}

setGlobalVariable('argv', argv);

// Setup local package registry
const registryPath =
  fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'angular-cli-e2e-registry-'));
fs.copyFileSync(
  path.join(__dirname, 'verdaccio.yaml'),
  path.join(registryPath, 'verdaccio.yaml'),
);
const registryProcess = spawn(
  'node',
  [require.resolve('verdaccio/bin/verdaccio'), '-c', './verdaccio.yaml'],
  { cwd: registryPath, stdio: 'inherit' },
);

testsToRun
  .reduce((previous, relativeName, testIndex) => {
    // Make sure this is a windows compatible path.
    let absoluteName = path.join(e2eRoot, relativeName);
    if (/^win/.test(process.platform)) {
      absoluteName = absoluteName.replace(/\\/g, path.posix.sep);
    }

    return previous.then(() => {
      currentFileName = relativeName.replace(/\.ts$/, '');
      const start = +new Date();

      const module = require(absoluteName);
      const fn: (skipClean?: () => void) => Promise<void> | void =
        typeof module == 'function'
          ? module
          : typeof module.default == 'function'
          ? module.default
          : () => {
              throw new Error('Invalid test module.');
            };

      let clean = true;
      let previousDir = null;

      return Promise.resolve()
        .then(() => printHeader(currentFileName, testIndex))
        .then(() => (previousDir = process.cwd()))
        .then(() => logStack.push(lastLogger().createChild(currentFileName)))
        .then(() => fn(() => (clean = false)))
        .then(
          () => logStack.pop(),
          err => {
            logStack.pop();
            throw err;
          },
        )
        .then(() => console.log('----'))
        .then(() => {
          // If we're not in a setup, change the directory back to where it was before the test.
          // This allows tests to chdir without worrying about keeping the original directory.
          if (allSetups.indexOf(relativeName) == -1 && previousDir) {
            process.chdir(previousDir);
          }
        })
        .then(() => {
          // Only clean after a real test, not a setup step. Also skip cleaning if the test
          // requested an exception.
          if (allSetups.indexOf(relativeName) == -1 && clean) {
            logStack.push(new logging.NullLogger());

            return gitClean().then(
              () => logStack.pop(),
              err => {
                logStack.pop();
                throw err;
              },
            );
          }
        })
        .then(
          () => printFooter(currentFileName, start),
          err => {
            printFooter(currentFileName, start);
            console.error(err);
            throw err;
          },
        );
    });
  }, Promise.resolve())
  .then(
    () => {
      if (registryProcess) {
        registryProcess.kill();
      }

      console.log(green('Done.'));
      process.exit(0);
    },
    err => {
      console.log('\n');
      console.error(red(`Test "${currentFileName}" failed...`));
      console.error(red(err.message));
      console.error(red(err.stack));

      if (registryProcess) {
        registryProcess.kill();
      }

      if (argv.debug) {
        console.log(`Current Directory: ${process.cwd()}`);
        console.log('Will loop forever while you debug... CTRL-C to quit.');

        /* eslint-disable no-constant-condition */
        while (1) {
          // That's right!
        }
      }

      process.exit(1);
    },
  );

function printHeader(testName: string, testIndex: number) {
  const text = `${testIndex + 1} of ${testsToRun.length}`;
  const fullIndex =
    (testIndex < allSetups.length
      ? testIndex
      : (testIndex - allSetups.length) * nbShards + shardId + allSetups.length) + 1;
  const length = tests.length + allSetups.length;
  const shard =
    shardId === null ? '' : yellow(` [${shardId}:${nbShards}]` + bold(` (${fullIndex}/${length})`));
  console.log(green(`Running "${bold(blue(testName))}" (${bold(white(text))}${shard})...`));
}

function printFooter(testName: string, startTime: number) {
  // Round to hundredth of a second.
  const t = Math.round((Date.now() - startTime) / 10) / 100;
  console.log(green('Last step took ') + bold(blue(t)) + green('s...'));
  console.log('');
}
