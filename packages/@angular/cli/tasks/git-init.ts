import { oneLine } from 'common-tags';
import denodeify = require('denodeify');

const exec: any = denodeify(require('child_process').exec);
const path = require('path');
const pkg = require('../package.json');
const fs = require('fs');
const template = require('lodash/template');
const Task = require('../ember-cli/lib/models/task');

const gitEnvironmentVariables = {
  GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'Angular CLI',
  GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'angular-cli@angular.io',
  get GIT_COMMITTER_NAME() {
    return this.GIT_AUTHOR_NAME;
  },
  get GIT_COMMITTER_EMAIL() {
    return this.GIT_AUTHOR_EMAIL;
  }
};

module.exports = Task.extend({
  run: function (commandOptions: any) {
    const chalk = require('chalk');
    const ui = this.ui;

    if (commandOptions.skipGit) {
      return Promise.resolve();
    }

    return exec('git --version')
      .then(function () {
        // check if we're inside a git repo
        return exec('git rev-parse --is-inside-work-tree')
          .then(function () {
            return true;
          })
          .catch(function() {
            return false;
          });
      })
      .then(function (insideGitRepo: boolean) {
        if (insideGitRepo) {
          ui.writeLine(oneLine`
            Directory is already under version control.
            Skipping initialization of git.`);
          return;
        }
        return exec('git init')
          .then(function () {
            return exec('git add .');
          })
          .then(function () {
            if (!commandOptions.skipCommit) {
              const commitTemplate = fs.readFileSync(
                path.join(__dirname, '../utilities/INITIAL_COMMIT_MESSAGE.txt'));
              const commitMessage = template(commitTemplate)(pkg);
              return exec(
                'git commit -m "' + commitMessage + '"', { env: gitEnvironmentVariables });
            }
          })
          .then(function () {
            ui.writeLine(chalk.green('Successfully initialized git.'));
          });
      })
      .catch(function (/*error*/) {
        // if git is not found or an error was thrown during the `git`
        // init process just swallow any errors here
      });
  }
});

module.exports.overrideCore = true;
