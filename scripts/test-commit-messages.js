require('../lib/bootstrap-local');

const validateCommitMessage = require('./validate-commit-message');
const exec = require('child_process').exec;
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
  .filter((entry) => entry.level == 'fatal')
  .subscribe(() => {
    process.stderr.write('A fatal error happened. See details above.');
    process.exit(1);
  });

// Note: This is based on the gulp task found in the angular/angular repository

exec(
  'git fetch origin master && git log --reverse --format=%s origin/master.. --no-merges',
  (error, stdout, stderr) => {
    if (error) {
      logger.fatal(stderr);
      return;
    }

    const output = stdout.trim();
    if (output.length == 0) {
      logger.warn('There are zero new commits between this HEAD and master');
      return;
    }

    const commitsByLine = output.split(/\n/);

    logger.info(`Examining ${commitsByLine.length} commit(s) between HEAD and master`);

    const someCommitsInvalid = !commitsByLine.every(validateCommitMessage);

    if (someCommitsInvalid) {
      logger.error('Please fix the failing commit messages before continuing...');
      logger.fatal(
        'Commit message guidelines: https://github.com/angular/angular-cli/blob/master/CONTRIBUTING.md#commit');
    } else {
      logger.info('All commit messages are valid.');
    }
  });
