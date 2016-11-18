const Command = require('../ember-cli/lib/models/command');
const SilentError = require('silent-error');
import denodeify = require('denodeify');

import { exec } from 'child_process';
import * as chalk from 'chalk';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import WebpackBuild from '../tasks/build-webpack';
import CreateGithubRepo from '../tasks/create-github-repo';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';

const fsReadDir = <any>denodeify(fs.readdir);
const fsCopy = <any>denodeify(fse.copy);

interface GithubPagesDeployOptions {
  message?: string;
  target?: string;
  environment?: string;
  userPage?: boolean;
  skipBuild?: boolean;
  ghToken?: string;
  ghUsername?: string;
  baseHref?: string;
}

const githubPagesDeployCommand = Command.extend({
  name: 'github-pages:deploy',
  aliases: ['gh-pages:deploy'],
  description: oneLine`
    Build the test app for production, commit it into a git branch,
    setup GitHub repo and push to it
  `,
  works: 'insideProject',

  availableOptions: [
    {
      name: 'message',
      type: String,
      default: 'new gh-pages version',
      description: 'The commit message to include with the build, must be wrapped in quotes.'
    }, {
      name: 'target',
      type: String,
      default: 'production',
      aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }]
    }, {
      name: 'environment',
      type: String,
      default: '',
      aliases: ['e']
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
    }, {
      name: 'base-href',
      type: String,
      default: null,
      aliases: ['bh']
    }],

  run: function(options: GithubPagesDeployOptions, rawArgs: string[]) {
    const ui = this.ui;
    const root = this.project.root;
    const execOptions = {
      cwd: root
    };

    if (options.environment === '') {
      if (options.target === 'development') {
        options.environment = 'dev';
      }
      if (options.target === 'production') {
        options.environment = 'prod';
      }
    }

    const projectName = this.project.pkg.name;

    const outDir = CliConfig.fromProject().config.apps[0].outDir;

    let ghPagesBranch = 'gh-pages';
    let destinationBranch = options.userPage ? 'master' : ghPagesBranch;
    let initialBranch: string;

    // declared here so that tests can stub exec
    const execPromise = <(cmd: string, options?: any) => Promise<string>>denodeify(exec);

    const buildTask = new WebpackBuild({
      ui: this.ui,
      analytics: this.analytics,
      cliProject: this.project,
      target: options.target,
      environment: options.environment,
      outputPath: outDir
    });

    /**
     * BaseHref tag setting logic:
     * First, use --base-href flag value if provided.
     * Else if --user-page is true, then keep baseHref default as declared in index.html.
     * Otherwise auto-replace with `/${projectName}/`.
     */
    const baseHref = options.baseHref || (options.userPage ? null : `/${projectName}/`);

    const buildOptions = {
      target: options.target,
      environment: options.environment,
      outputPath: outDir,
      baseHref: baseHref,
    };

    const createGithubRepoTask = new CreateGithubRepo({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    const createGithubRepoOptions = {
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
      .then(createNotFoundPage)
      .then(addAndCommit)
      .then(returnStartingBranch)
      .then(pushToGitRepo)
      .then(printProjectUrl)
      .catch(failGracefully);

    function checkForPendingChanges() {
      return execPromise('git status --porcelain')
        .then((stdout: string) => {
          if (/\w+/m.test(stdout)) {
            let msg = 'Uncommitted file changes found! Please commit all changes before deploying.';
            return Promise.reject(new SilentError(msg));
          }
        });
    }

    function build() {
      if (options.skipBuild) { return Promise.resolve(); }
      return buildTask.run(buildOptions);
    }

    function saveStartingBranchName() {
      return execPromise('git rev-parse --abbrev-ref HEAD')
        .then((stdout: string) => initialBranch = stdout.replace(/\s/g, ''));
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
        .catch(createGhPagesBranch);
    }

    function createGhPagesBranch() {
      return execPromise(`git checkout --orphan ${ghPagesBranch}`)
        .then(() => execPromise('git rm --cached -r .', execOptions))
        .then(() => execPromise('git add .gitignore', execOptions))
        .then(() => execPromise('git clean -f -d', execOptions))
        .then(() => execPromise(`git commit -m \"initial ${ghPagesBranch} commit\"`));
    }

    function copyFiles() {
      return fsReadDir(outDir)
        .then((files: string[]) => Promise.all(files.map((file) => {
          if (file === '.gitignore') {
            // don't overwrite the .gitignore file
            return Promise.resolve();
          }
          return fsCopy(path.join(outDir, file), path.join('.', file));
        })));
    }

    function createNotFoundPage() {
      const indexHtml = path.join(root, this.project.index);
      const notFoundPage = path.join(root, '404.html');
      return fsCopy(indexHtml, notFoundPage);
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
          let match = stdout.match(/origin\s+(?:https:\/\/|git@)github\.com(?:\:|\/)([^\/]+)/m);
          let userName = match[1].toLowerCase();
          let url = `https://${userName}.github.io/${options.userPage ? '' : (baseHref + '/')}`;
          ui.writeLine(chalk.green(`Deployed! Visit ${url}`));
          ui.writeLine('Github pages might take a few minutes to show the deployed site.');
        });
    }

    function failGracefully(error: Error) {
      if (error && (/git clean/.test(error.message) || /Permission denied/.test(error.message))) {
        ui.writeLine(error.message);
        let msg = 'There was a permissions error during git file operations, ' +
          'please close any open project files/folders and try again.';
        msg += `\nYou might also need to return to the ${initialBranch} branch manually.`;
        return Promise.reject(new SilentError(msg));
      } else {
        return Promise.reject(error);
      }
    }
  }
});


export default githubPagesDeployCommand;
