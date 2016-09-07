/*eslint-disable no-console */
'use strict';

/**
 * This file is ran using the command line, not using Jasmine / Mocha.
 */
const chalk = require('chalk');
const glob = require('glob');
const minimist = require('minimist');
const path = require('path');
const blue = chalk.blue;
const bold = chalk.bold;
const green = chalk.green;
const red = chalk.red;
const white = chalk.white;


require('../lib/bootstrap-local');


const argv = minimist(process.argv.slice(2), {
  'boolean': ['debug', 'nolink', 'nightly'],
  'string': ['reuse']
});


let currentFileName = null;
let index = 0;

const e2eRoot = path.join(__dirname, 'e2e');
const allTests = glob.sync(path.join(e2eRoot, '**/*'), { nodir: true })
  .map(name => path.relative(e2eRoot, name))
  .filter(name => name.match(/^\d\d\d/))
  .sort();

const testsToRun = allTests.filter(name => {
  // Check for naming tests on command line.
  if (argv._.length == 0) {
    return true;
  }

  return name.match(/000-setup/) || argv._.some(argName => {
    return path.join(process.cwd(), argName) == path.join(__dirname, name)
      || argName == name
      || argName == name.replace(/\d\d\d-/g, '')
      || argName == name.replace(/\.ts$/, '').replace(/\d\d\d-/g, '');
  });
});


/**
 * Load all the files from the e2e, filter and sort them and build a promise of their default
 * export.
 */
if (testsToRun.length == allTests.length) {
  console.log(`Running ${testsToRun.length} tests`);
} else {
  console.log(`Running ${testsToRun.length} tests (${allTests.length} total)`);
}

testsToRun.reduce((previous, relativeName) => {
  const absoluteName = path.join(e2eRoot, relativeName);
  return previous.then(() => {
    currentFileName = relativeName.replace(/\.ts$/, '');
    const start = +new Date();

    const module = require(absoluteName);
    const fn = (typeof module == 'function') ? module
      : (typeof module.default == 'function') ? module.default
      : function() {
        throw new Error('Invalid test module.');
      };

    const testName = currentFileName.replace(/\d\d\d-/g, '');

    return Promise.resolve()
      .then(() => printHeader(testName))
      .then(() => fn(argv))
      .then(() => printFooter(testName, start),
            (err) => {
              printFooter(testName, start); throw err;
            });
  });
}, Promise.resolve())
.then(
  () => console.log(green('Done.')),
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
  }
);


function encode(str) {
  return str.replace(/[^A-Za-z\d\/]+/g, '-').replace(/\//g, '.').replace(/[\/-]$/, '');
}

function isTravis() {
  return process.env['TRAVIS'];
}

function printHeader(testName) {
  const text = `${index++} of ${testsToRun.length}`;
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
