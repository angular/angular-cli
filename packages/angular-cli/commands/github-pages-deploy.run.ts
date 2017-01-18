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
import { GithubPagesDeployOptions } from './github-pages-deploy';

const fsReadDir = <any>denodeify(fs.readdir);
const fsCopy = <any>denodeify(fse.copy);
const fsWriteFile = <any>denodeify(fse.writeFile);

export default function githubPagesDeployRun(options: GithubPagesDeployOptions, rawArgs: string[]) {
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
  const indexFilename = CliConfig.fromProject().config.apps[0].index;

  let ghPagesBranch = 'gh-pages';
  let destinationBranch = options.userPage ? 'master' : ghPagesBranch;
  let initialBranch: string;
  let branchErrMsg = ' You might also need to return to the initial branch manually.';

  // declared here so that tests can stub exec
  const execPromise = <(cmd: string, options?: any) => Promise<string>>denodeify(exec);

  const buildTask = new WebpackBuild({
    ui: this.ui,
    cliProject: this.project,
    target: options.target,
    environment: options.environment,
    outputPath: outDir
  });

  /**
   * BaseHref tag setting logic:
   * First, no value if --custom-domain is provided.
   * Second, use --base-href flag value if provided.
   * Else if --user-page is true, then keep baseHref default as declared in index.html.
   * Otherwise auto-replace with `/${projectName}/`.
   */
  let baseHref: String = null;
  if (!options.customDomain) {
    baseHref = options.baseHref || (options.userPage ? null : `/${projectName}/`);
  }

  const buildOptions = {
    target: options.target,
    environment: options.environment,
    outputPath: outDir,
    baseHref: baseHref,
    aot: options.aot,
    vendorChunk: options.vendorChunk,
  };

  const createGithubRepoTask = new CreateGithubRepo({
    ui: this.ui,
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
    .then(cleanGhPagesBranch)
    .then(copyFiles)
    .then(createNotFoundPage)
    .then(createCustomDomainFile)
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
                .then(() => generateRemoteUrl())
                .then((upstream: string) => {
                  // only push starting branch if it's not the destinationBranch
                  // this happens commonly when using github user pages, since
                  // they require the destination branch to be 'master'
                  if (destinationBranch !== initialBranch) {
                    execPromise(`git push -u ${upstream} ${initialBranch}`);
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

  function cleanGhPagesBranch() {
    return execPromise('git ls-files')
      .then(function (stdout) {
        let files = '';
        stdout.split(/\n/).forEach(function (f) {
          // skip .gitignore & 404.html
          if ((f != '') && (f != '.gitignore') && (f != '404.html')) {
            files = files.concat(`"${f}" `);
          }
        });
        return execPromise(`git rm -r ${files}`)
          .catch(() => {
            // Ignoring errors when trying to erase files.
          });
      });
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
    const indexHtml = path.join(root, indexFilename);
    const notFoundPage = path.join(root, '404.html');
    return fsCopy(indexHtml, notFoundPage);
  }

  function createCustomDomainFile() {
    if (!options.customDomain) {
      return;
    }

    const cnameFile = path.join(root, 'CNAME');
    return fsWriteFile(cnameFile, options.customDomain);
  }

  function addAndCommit() {
    return execPromise('git add .', execOptions)
      .then(() => execPromise(`git commit -m "${options.message}"`))
      .catch(() => {
        let msg = 'No changes found. Deployment skipped.';
        return returnStartingBranch()
          .then(() => Promise.reject(new SilentError(msg)))
          .catch(() => Promise.reject(new SilentError(msg.concat(branchErrMsg))));
      });
  }

  function returnStartingBranch() {
    return execPromise(`git checkout ${initialBranch}`);
  }

  function pushToGitRepo() {
    return generateRemoteUrl()
        .then(upstream => {
          return execPromise(`git push ${upstream} ${ghPagesBranch}:${destinationBranch}`);
        })
        .catch((err) => returnStartingBranch()
            .catch(() => Promise.reject(err) ));
  }

  function printProjectUrl() {
    return getUsernameFromGitOrigin()
        .then((userName) => {
          let url = '';

          if (options.customDomain) {
            url = `http://${options.customDomain}/`;
          } else {
            url = `https://${userName}.github.io/${options.userPage ? '' : (baseHref + '/')}`;
          }

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
      return Promise.reject(new SilentError(msg.concat(branchErrMsg)));
    } else {
      return Promise.reject(error);
    }
  }

  function generateRemoteUrl(): Promise<String> {
    if (createGithubRepoOptions.ghToken && createGithubRepoOptions.ghUsername) {
      return Promise.resolve(`https://${createGithubRepoOptions.ghToken}@github.com/` +
          `${createGithubRepoOptions.ghUsername}/${createGithubRepoOptions.projectName}.git`);
    }

    if (createGithubRepoOptions.ghToken && !createGithubRepoOptions.ghUsername) {
      return getUsernameFromGitOrigin()
          .then(username => {
            return Promise.resolve(`https://${createGithubRepoOptions.ghToken}@github.com/` +
                `${username}/${createGithubRepoOptions.projectName}.git`);
          });
    }

    return Promise.resolve('origin');
  }

  function getUsernameFromGitOrigin(): Promise<String> {
    return execPromise('git remote -v')
        .then((stdout) => {
          let match = stdout.match(/origin\s+(?:https:\/\/|git@)github\.com(?:\:|\/)([^\/]+)/m);
          return match[1].toLowerCase();
        });
  }
}
