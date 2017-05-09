'use strict';

require('../lib/bootstrap-local');

const validateCommitMessage = require('./validate-commit-message');
const execSync = require('child_process').execSync;
const chalk = require('chalk');
const Logger = require('@ngtools/logger').Logger;
require('rxjs/add/operator/filter');

// Configure logger
const logger = new Logger('test-commit-messages');

logger.subscribe((entry) => {
  let color = chalk.white;
  let output = process.stdout;
  switch (entry.level) {
    case 'info': color = chalk.white; break;
    case 'warn': color = chalk.yellow; break;
    case 'error': color = chalk.red; output = process.stderr; break;
    case 'fatal': color = (x) => chalk.bold(chalk.red(x)); output = process.stderr; break;
  }

  output.write(color(entry.message) + '\n');
});

logger
  .filter((entry) => entry.level === 'fatal')
  .subscribe(() => {
    process.stderr.write('A fatal error happened. See details above.');
    process.exit(1);
  });

// Note: This is based on the gulp task found in the angular/angular repository
execSync('git fetch origin');
// Travis doesn't have master when running jobs on other branches (minor/patch/etc).
execSync('git fetch origin master:master');

// Get PR target branch, default to master for running locally.
const currentBranch = process.env.TRAVIS_BRANCH
  || process.env.APPVEYOR_REPO_BRANCH
  || 'master';

const output = execSync('git log ' + currentBranch + '..HEAD --reverse --format="%H %s" --no-merges', {
  encoding: 'utf-8'
});

if (output.length === 0) {
  logger.warn('There are zero new commits between this HEAD and master');
  process.exit(0);
}
const commitsByLine = output.trim().split(/\n/).map(line => {
  return line.trim().split(' ').slice(1).join(' ');
});
logger.info(`Examining ${commitsByLine.length} commit(s) between HEAD and master`);

const someCommitsInvalid = !commitsByLine.every(message => validateCommitMessage(message));

if (someCommitsInvalid) {
  logger.error('Please fix the failing commit messages before continuing...');
  logger.fatal(
    'Commit message guidelines: https://github.com/angular/angular-cli/blob/master/CONTRIBUTING.md#commit');
} else {
  logger.info('All commit messages are valid.');
}
