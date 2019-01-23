/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging } from '@angular-devkit/core';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PackageInfo, packages } from '../lib/packages';
import build from './build';
import create from './create';


// Added to the README.md of the snapshot. This is markdown.
const readmeHeaderFn = (pkg: PackageInfo) => `
# Snapshot build of ${pkg.name}

This repository is a snapshot of a commit on the original repository. The original code used to
generate this is located at http://github.com/angular/angular-cli.

We do not accept PRs or Issues opened on this repository. You should not use this over a tested and
released version of this package.

To test this snapshot in your own project, use

\`\`\`bash
npm install git+https://github.com/${pkg.snapshotRepo}.git
\`\`\`

----
`;


function _copy(from: string, to: string) {
  fs.readdirSync(from)
    .forEach(name => {
      const fromPath = path.join(from, name);
      const toPath = path.join(to, name);
      if (fs.statSync(fromPath).isDirectory()) {
        if (!fs.existsSync(toPath)) {
          fs.mkdirSync(toPath);
        }
        _copy(fromPath, toPath);
      } else {
        fs.writeFileSync(toPath, fs.readFileSync(fromPath));
      }
    });
}


function _exec(command: string, args: string[], opts: { cwd?: string }, logger: logging.Logger) {
  const { status, error, stdout } = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });

  if (status != 0) {
    logger.error(`Command failed: ${command} ${args.map(x => JSON.stringify(x)).join(', ')}`);
    throw error;
  }

  return stdout.toString('utf-8');
}

async function _publishSnapshot(
  pkg: PackageInfo,
  branch: string,
  message: string,
  logger: logging.Logger,
  githubToken: string,
) {
  if (!pkg.snapshot) {
    logger.warn(`Skipping ${pkg.name}.`);

    return;
  }

  logger.info(`Publishing ${pkg.name} to repo ${JSON.stringify(pkg.snapshotRepo)}.`);

  const root = process.cwd();
  const publishLogger = logger.createChild('publish');
  publishLogger.debug('Temporary directory: ' + root);

  const url = `https://${githubToken ? githubToken + '@' : ''}github.com/${pkg.snapshotRepo}.git`;
  const destPath = path.join(root, path.basename(pkg.snapshotRepo));

  _exec('git', ['clone', url], { cwd: root }, publishLogger);
  if (branch) {
    // Try to checkout an existing branch, otherwise create it.
    try {
      _exec('git', ['checkout', branch], { cwd: destPath }, publishLogger);
    } catch {
      _exec('git', ['checkout', '-b', branch], { cwd: destPath }, publishLogger);
    }
  }

  // Clear snapshot directory before publishing to remove deleted build files.
  try {
    _exec('git', ['rm', '-rf', './'], {cwd: destPath}, publishLogger);
  } catch {
    // Ignore errors on delete. :shrug:
  }
  _copy(pkg.dist, destPath);

  if (githubToken) {
    _exec('git', ['config', 'commit.gpgSign', 'false'], { cwd: destPath }, publishLogger);
  }

  // Add the header to the existing README.md (or create a README if it doesn't exist).
  const readmePath = path.join(destPath, 'README.md');
  let readme = readmeHeaderFn(pkg);
  try {
    readme += fs.readFileSync(readmePath, 'utf-8');
  } catch {}

  fs.writeFileSync(readmePath, readme);

  // Make sure that every snapshots is unique (otherwise we would need to make sure git accepts
  // empty commits).
  fs.writeFileSync(path.join(destPath, 'uniqueId'), '' + new Date());

  // Commit and push.
  _exec('git', ['add', '.'], { cwd: destPath }, publishLogger);
  _exec('git', ['commit', '-a', '-m', message], { cwd: destPath }, publishLogger);
  _exec('git', ['tag', pkg.snapshotHash], { cwd: destPath }, publishLogger);
  _exec('git', ['push', 'origin', branch], { cwd: destPath }, publishLogger);
  _exec('git', ['push', '--tags', 'origin', branch], { cwd: destPath }, publishLogger);
}


export interface SnapshotsOptions {
  force?: boolean;
  githubTokenFile?: string;
  githubToken?: string;
  branch?: string;
}

export default async function(opts: SnapshotsOptions, logger: logging.Logger) {
  // Get the SHA.
  if (execSync(`git status --porcelain`).toString() && !opts.force) {
    logger.error('You cannot run snapshots with local changes.');
    process.exit(1);
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'angular-cli-publish-'));
  const message = execSync(`git log --format="%h %s" -n1`).toString().trim();
  let branch = opts.branch || 'master';

  // CIRCLE_BRANCH
  if (typeof process.env['CIRCLE_BRANCH'] == 'string') {
    branch = '' + process.env['CIRCLE_BRANCH'];
  }

  const githubToken = (
    opts.githubToken
    || (opts.githubTokenFile && fs.readFileSync(opts.githubTokenFile, 'utf-8'))
    || ''
  ).trim();

  if (githubToken) {
    logger.info('Setting up global git name.');
    _exec('git', ['config', '--global', 'user.email', 'circleci@angular.io'], {}, logger);
    _exec('git', ['config', '--global', 'user.name', 'Angular Builds'], {}, logger);
    _exec('git', ['config', '--global', 'push.default', 'simple'], {}, logger);
  }

  // Creating a new project and reading the help.
  logger.info('Creating temporary project...');
  const newProjectTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'angular-cli-create-'));
  const newProjectName = 'help-project';
  const newProjectRoot = path.join(newProjectTempRoot, newProjectName);
  await create({ _: [newProjectName] }, logger.createChild('create'), newProjectTempRoot);

  // Run build.
  logger.info('Building...');
  await build({ snapshot: true }, logger.createChild('build'));

  logger.info('Gathering JSON Help...');
  const ngPath = path.join(newProjectRoot, 'node_modules/.bin/ng');
  const helpOutputRoot = path.join(packages['@angular/cli'].dist, 'help');
  fs.mkdirSync(helpOutputRoot);
  const commands = require('../packages/angular/cli/commands.json');
  for (const commandName of Object.keys(commands)) {
    const options = { cwd: newProjectRoot };
    const childLogger = logger.createChild(commandName);
    const stdout = _exec(ngPath, [commandName, '--help=json'], options, childLogger);
    // Make sure the output is JSON before printing it, and format it as well.
    const jsonOutput = JSON.stringify(JSON.parse(stdout.trim()), undefined, 2);
    fs.writeFileSync(path.join(helpOutputRoot, commandName + '.json'), jsonOutput);
  }

  if (!githubToken) {
    logger.info('No token given, skipping actual publishing...');

    return 0;
  }

  for (const packageName of Object.keys(packages)) {
    process.chdir(root);
    await _publishSnapshot(packages[packageName], branch, message, logger, githubToken);
  }

  return 0;
}
