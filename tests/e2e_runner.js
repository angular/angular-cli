/*eslint-disable no-console */
'use strict';
require('../lib/bootstrap-local');

Error.stackTraceLimit = Infinity;

/**
 * This file is ran using the command line, not using Jasmine / Mocha.
 */
const chalk = require('chalk');
const gitClean = require('./e2e/utils/git').gitClean;
const glob = require('glob');
const minimist = require('minimist');
const path = require('path');
const blue = chalk.blue;
const bold = chalk.bold;
const green = chalk.green;
const red = chalk.red;
const white = chalk.white;


/**
 * Here's a short description of those flags:
 *   --debug          If a test fails, block the thread so the temporary directory isn't deleted.
 *   --noproject      Skip creating a project or using one.
 *   --nolink         Skip linking your local angular-cli directory. Can save a few seconds.
 *   --nightly        Install angular nightly builds over the test project.
 *   --reuse=/path    Use a path instead of create a new project. That project should have been
 *                    created, and npm installed. Ideally you want a project created by a previous
 *                    run of e2e.
 * If unnamed flags are passed in, the list of tests will be filtered to include only those passed.
 */
const argv = minimist(process.argv.slice(2), {
  'boolean': ['debug', 'nolink', 'nightly', 'noproject'],
  'string': ['reuse']
});


let currentFileName = null;
let index = 0;

const e2eRoot = path.join(__dirname, 'e2e');
const allSetups = glob.sync(path.join(e2eRoot, 'setup/**/*'), { nodir: true })
  .map(name => path.relative(e2eRoot, name))
  .sort();
const allTests = glob.sync(path.join(e2eRoot, 'tests/**/*'), { nodir: true })
  .map(name => path.relative(e2eRoot, name))
  .sort();

const testsToRun = allSetups
  .concat(allTests
    .filter(name => {
      // Check for naming tests on command line.
      if (argv._.length == 0) {
        return true;
      }

      return argv._.some(argName => {
        return path.join(process.cwd(), argName) == path.join(__dirname, 'e2e', name)
            || argName == name
            || argName == name.replace(/\.ts$/, '');
      });
    }));


/**
 * Load all the files from the e2e, filter and sort them and build a promise of their default
 * export.
 */
if (testsToRun.length == allTests.length) {
  console.log(`Running ${testsToRun.length} tests`);
} else {
  console.log(`Running ${testsToRun.length} tests (${allTests.length + allSetups.length} total)`);
}

testsToRun.reduce((previous, relativeName) => {
  // Make sure this is a windows compatible path.
  let absoluteName = path.join(e2eRoot, relativeName);
  if (/^win/.test(process.platform)) {
    absoluteName = absoluteName.replace(/\\/g, path.posix.sep);
  }

  return previous.then(() => {
    currentFileName = relativeName.replace(/\.ts$/, '');
    const start = +new Date();

    const module = require(absoluteName);
    const fn = (typeof module == 'function') ? module
      : (typeof module.default == 'function') ? module.default
      : function() {
        throw new Error('Invalid test module.');
      };

    let clean = true;
    return Promise.resolve()
      .then(() => printHeader(currentFileName))
      .then(() => fn(argv, () => clean = false))
      .then(() => {
        // Only clean after a real test, not a setup step. Also skip cleaning if the test
        // requested an exception.
        if (allSetups.indexOf(relativeName) == -1 && clean) {
          return gitClean();
        }
      })
      .then(() => printFooter(currentFileName, start),
            (err) => {
              printFooter(currentFileName, start); throw err;
            });
  });
}, Promise.resolve())
.then(() => {
  console.log(green('Done.'));
  process.exit(0);
},
(err) => {
  console.log('\n');
  console.error(red(`Test "${currentFileName}" failed...`));
  console.error(red(err.message));
  console.error(red(err.stack));

  if (argv.debug) {
    console.log(`Current Directory: ${process.cwd()}`);
    console.log('Will loop forever while you debug... CTRL-C to quit.');

    /* eslint-disable no-constant-condition */
    while (1) {
      // That's right!
    }
  }

  process.exit(1);
});


function encode(str) {
  return str.replace(/[^A-Za-z\d\/]+/g, '-').replace(/\//g, '.').replace(/[\/-]$/, '');
}

function isTravis() {
  return process.env['TRAVIS'];
}

function printHeader(testName) {
  const text = `${++index} of ${testsToRun.length}`;
  console.log(green(`Running "${bold(blue(testName))}" (${bold(white(text))})...`));

  if (isTravis()) {
    console.log(`travis_fold:start:${encode(testName)}`);
  }
}

function printFooter(testName, startTime) {
  if (isTravis()) {
    console.log(`travis_fold:end:${encode(testName)}`);
  }

  // Round to hundredth of a second.
  const t = Math.round((Date.now() - startTime) / 10) / 100;
  console.log(green('Last step took ') + bold(blue(t)) + green('s...'));
  console.log('');
}
