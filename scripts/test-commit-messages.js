'use strict';

require('../lib/bootstrap-local');

const fs = require('fs');
const path = require('path');
const validateCommitMessage = require('./validate-commit-message');
const execSync = require('child_process').execSync;
const chalk = require('chalk');
const Logger = require('@ngtools/logger').Logger;
const configPath = path.resolve(__dirname, './validate-commit-message/commit-message.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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

// Find the branch
const branchRefs = {};
for (const name of config['branches']) {
  try {
    const output = execSync(`git show-ref --hash ${name}`, { encoding: 'utf-8' });
    if (output) {
      branchRefs[name] = output.replace(/\n/g, '').trim();
    }
  } catch (e) {
    // Ignore.
  }
}
logger.info(`Found refs for branches:\n  ${Object.keys(branchRefs).map(key => {
  return `${key} => ${JSON.stringify(branchRefs[key])}`;
}).join('\n  ')}`);


const output = execSync('git log --format="%H %s" --no-merges', { encoding: 'utf-8' });

if (output.length === 0) {
  logger.warn('There are zero new commits between this HEAD and master');
  process.exit(0);
}

const commitsByLine = [];
let branch = null;

// Finding the closest branch marker.
for (const line of output.split(/\n/)) {
  const [hash, ...messageArray] = line.split(' ');
  const message = messageArray.join(' ');

  const maybeBranch = Object.keys(branchRefs).find(branchName => branchRefs[branchName] === hash);
  if (maybeBranch) {
    branch = maybeBranch;
    break;
  }
  commitsByLine.push(message);
}

if (!branch) {
  logger.fatal('Something wrong happened.');
  process.exit(1);
}

logger.info(`Examining ${commitsByLine.length} commit(s) between HEAD and ${branch}`);

const someCommitsInvalid = !commitsByLine.every(message => validateCommitMessage(message, branch));

if (someCommitsInvalid) {
  logger.error('Please fix the failing commit messages before continuing...');
  logger.fatal(
    'Commit message guidelines: https://github.com/angular/angular-cli/blob/master/CONTRIBUTING.md#commit');
} else {
  logger.info('All commit messages are valid.');
}
