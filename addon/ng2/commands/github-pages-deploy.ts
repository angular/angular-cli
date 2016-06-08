import * as Command from 'ember-cli/lib/models/command';
import * as SilentError from 'silent-error';
import { exec } from 'child_process';
import * as Promise from 'ember-cli/lib/ext/promise';
import * as chalk from 'chalk';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as BuildTask from 'ember-cli/lib/tasks/build';
import * as win from 'ember-cli/lib/utilities/windows-admin';
import * as CreateGithubRepo from '../tasks/create-github-repo';

const fsReadFile = Promise.denodeify(fs.readFile);
const fsWriteFile = Promise.denodeify(fs.writeFile);
const fsReadDir = Promise.denodeify(fs.readdir);
const fsCopy = Promise.denodeify(fse.copy);

module.exports = Command.extend({
  name: 'github-pages:deploy',
  aliases: ['gh-pages:deploy'],
  description: 'Build the test app for production, commit it into a git branch, setup GitHub repo and push to it',
  works: 'insideProject',

  availableOptions: [
    {
      name: 'message',
      type: String,
      default: 'new gh-pages version',
      description: 'The commit message to include with the build, must be wrapped in quotes.'
    }, {
      name: 'environment',
      type: String,
      default: 'production',
      description: 'The Angular environment to create a build for'
    }, {
      name: 'user-page',
      type: Boolean,
      default: false,
      description: 'Deploy as a user/org page'
    }, {
      name: 'skip-build',
      type: Boolean,
      default: false,
      description: 'Skip building the project before deploying'
    }, {
      name: 'gh-token',
      type: String,
      default: '',
      description: 'Github token'
    }, {
      name: 'gh-username',
      type: String,
      default: '',
      description: 'Github username'
    }],

  run: function(options, rawArgs) {
    var ui = this.ui;
    var root = this.project.root;
    var execOptions = {
      cwd: root
    };
    var projectName = this.project.pkg.name;

    let ghPagesBranch = 'gh-pages';
    let destinationBranch = options.userPage ? 'master' : ghPagesBranch;
    let initialBranch;

    // declared here so that tests can stub exec
    const execPromise = Promise.denodeify(exec);

    var buildTask = new BuildTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    var buildOptions = {
      environment: options.environment,
      outputPath: 'dist/'
    };

    var createGithubRepoTask = new CreateGithubRepo({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    var createGithubRepoOptions = {
      projectName,
      ghUsername: options.ghUsername,
      ghToken: options.ghToken
    };

    return checkForPendingChanges()
      .then(build)
      .then(saveStartingBranchName)
      .then(createGitHubRepoIfNeeded)
      .then(checkoutGhPages)
      .then(copyFiles)
      .then(updateBaseHref)
      .then(addAndCommit)
      .then(returnStartingBranch)
      .then(pushToGitRepo)
      .then(printProjectUrl)
      .catch(failGracefully);

    function checkForPendingChanges() {
      return execPromise('git status --porcelain')
        .then(stdout => {
          if (/\w+/m.test(stdout)) {
            let msg = 'Uncommitted file changes found! Please commit all changes before deploying.';
            return Promise.reject(new SilentError(msg));
          }
        });
    }

    function build() {
      if (options.skipBuild) return Promise.resolve();
      return win.checkWindowsElevation(ui)
        .then(() => buildTask.run(buildOptions));
    }

    function saveStartingBranchName() {
      return execPromise('git rev-parse --abbrev-ref HEAD')
        .then((stdout) => initialBranch = stdout.replace(/\s/g, ''));
    }

    function createGitHubRepoIfNeeded() {
      return execPromise('git remote -v')
        .then(function(stdout) {
          if (!/origin\s+(https:\/\/|git@)github\.com/m.test(stdout)) {
            return createGithubRepoTask.run(createGithubRepoOptions)
              .then(() => {
                // only push starting branch if it's not the destinationBranch
                // this happens commonly when using github user pages, since
                // they require the destination branch to be 'master'
                if (destinationBranch !== initialBranch) {
                  execPromise(`git push -u origin ${initialBranch}`);
                }
              });
          }
        });
    }

    function checkoutGhPages() {
      return execPromise(`git checkout ${ghPagesBranch}`)
        .catch(createGhPagesBranch)
    }

    function createGhPagesBranch() {
      return execPromise(`git checkout --orphan ${ghPagesBranch}`)
        .then(() => execPromise('git rm --cached -r .', execOptions))
        .then(() => execPromise('git add .gitignore', execOptions))
        .then(() => execPromise('git clean -f -d', execOptions))
        .then(() => execPromise(`git commit -m \"initial ${ghPagesBranch} commit\"`));
    }

    function copyFiles() {
      return fsReadDir('dist')
        .then((files) => Promise.all(files.map((file) => {
          if (file === '.gitignore'){
            // don't overwrite the .gitignore file
            return Promise.resolve();
          }
          return fsCopy(path.join('dist', file), path.join('.', file))
        })));
    }

    function updateBaseHref() {
      if (options.userPage) return Promise.resolve();
      let indexHtml = path.join(root, 'index.html');
      return fsReadFile(indexHtml, 'utf8')
        .then((data) => data.replace(/<base href="\/">/g, `<base href="/${projectName}/">`))
        .then((data) => {
          fsWriteFile(indexHtml, data, 'utf8');
          fsWriteFile(path.join(root, '404.html'), data, 'utf8');
        });
    }

    function addAndCommit() {
      return execPromise('git add .', execOptions)
        .then(() => execPromise(`git commit -m "${options.message}"`))
        .catch(() => Promise.reject(new SilentError('No changes found. Deployment skipped.')));
    }

    function returnStartingBranch() {
      return execPromise(`git checkout ${initialBranch}`);
    }

    function pushToGitRepo() {
      return execPromise(`git push origin ${ghPagesBranch}:${destinationBranch}`);
    }

    function printProjectUrl() {
      return execPromise('git remote -v')
        .then((stdout) => {
          let userName = stdout.match(/origin\s+(?:https:\/\/|git@)github\.com(?:\:|\/)([^\/]+)/m)[1].toLowerCase();
          let url = `https://${userName}.github.io/${options.userPage ? '' : (projectName + '/')}`;
          ui.writeLine(chalk.green(`Deployed! Visit ${url}`));
          ui.writeLine('Github pages might take a few minutes to show the deployed site.');
        });
    }

    function failGracefully(error) {
      if (error && (/git clean/.test(error.message) || /Permission denied/.test(error.message))) {
        ui.writeLine(error.message);
        let msg = 'There was a permissions error during git file operations, please close any open project files/folders and try again.';
        msg += `\nYou might also need to return to the ${initialBranch} branch manually.`;
        return Promise.reject(new SilentError(msg));
      } else {
        return Promise.reject(error);
      }
    }
  }
});
