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
import { packages } from '../lib/packages';
import build from './build';


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
  const { status, error, stderr } = spawnSync(command, args, { ...opts });

  if (status != 0) {
    logger.error(`Command failed: ${command} ${args.map(x => JSON.stringify(x)).join(', ')}`);
    if (error) {
      logger.error('Error: ' + (error ? error.message : 'undefined'));
    } else {
      logger.error(`STDERR:\n${stderr}`);
    }
    throw error;
  }
}


export interface SnapshotsOptions {
  force?: boolean;
  githubTokenFile?: string;
  githubToken?: string;
}

export default function(opts: SnapshotsOptions, logger: logging.Logger) {
  // Get the SHA.
  if (execSync(`git status --porcelain`).toString() && !opts.force) {
    logger.error('You cannot run snapshots with local changes.');
    process.exit(1);
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'angular-devkit-publish-'));
  const message = execSync(`git log --format="%h %s" -n1`).toString().trim();

  const githubToken = (
    opts.githubToken
    || (opts.githubTokenFile && fs.readFileSync(opts.githubTokenFile, 'utf-8'))
    || ''
  ).trim();

  logger.info('Setting up global git name.');
  if (githubToken) {
    _exec('git', ['config', '--global', 'user.email', 'circleci@angular.io'], {}, logger);
    _exec('git', ['config', '--global', 'user.name', 'Angular Builds'], {}, logger);
    _exec('git', ['config', '--global', 'push.default', 'simple'], {}, logger);
  }

  // Run build.
  logger.info('Building...');
  build({ snapshot: true }, logger.createChild('build'));

  for (const packageName of Object.keys(packages)) {
    const pkg = packages[packageName];

    if (!pkg.snapshot) {
      logger.warn(`Skipping ${pkg.name}.`);
      continue;
    }

    logger.info(`Publishing ${pkg.name} to repo ${JSON.stringify(pkg.snapshotRepo)}.`);

    const publishLogger = logger.createChild('publish');
    publishLogger.debug('Temporary directory: ' + root);

    const url = `https://${githubToken ? githubToken + '@' : ''}github.com/${pkg.snapshotRepo}.git`;
    _exec('git', ['clone', url], { cwd: root }, publishLogger);

    const destPath = path.join(root, path.basename(pkg.snapshotRepo));
    // Clear snapshot directory before publishing to remove deleted build files.
    try {
      _exec('git', ['rm', '-rf', './'], {cwd: destPath}, publishLogger);
    } catch (e) {
      // Ignore errors on delete. :shrug:
    }
    _copy(pkg.dist, destPath);

    if (githubToken) {
      _exec('git', ['config', 'commit.gpgSign', 'false'], { cwd: destPath }, publishLogger);
    }

    // Make sure that every snapshots is unique.
    fs.writeFileSync(path.join(destPath, 'uniqueId'), '' + new Date());

    // Commit and push.
    _exec('git', ['add', '.'], { cwd: destPath }, publishLogger);
    _exec('git', ['commit', '-a', '-m', message], { cwd: destPath }, publishLogger);
    _exec('git', ['tag', pkg.snapshotHash], { cwd: destPath }, publishLogger);
    _exec('git', ['push', 'origin'], { cwd: destPath }, publishLogger);
    _exec('git', ['push', '--tags', 'origin'], { cwd: destPath }, publishLogger);
  }
}
