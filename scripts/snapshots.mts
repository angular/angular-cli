/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import build from './build.mjs';
import jsonHelp, { createTemporaryProject } from './json-help.mjs';
import { PackageInfo, packages } from './packages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Added to the README.md of the snapshot. This is markdown.
const readmeHeaderFn = (name: string, snapshotRepo: string) => `
# Snapshot build of ${name}

This repository is a snapshot of a commit on the original repository. The original code used to
generate this is located at http://github.com/angular/angular-cli.

We do not accept PRs or Issues opened on this repository. You should not use this over a tested and
released version of this package.

To test this snapshot in your own project, use

\`\`\`bash
npm install git+https://github.com/${snapshotRepo}.git
\`\`\`

----
`;

function _copy(from: string, to: string) {
  fs.readdirSync(from).forEach((name) => {
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

const monorepoData = JSON.parse(fs.readFileSync('./.monorepo.json', 'utf-8'));

function _exec(command: string, args: string[], opts: { cwd?: string }) {
  const { status, error, stdout } = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });

  if (status != 0) {
    console.error(`Command failed: ${command} ${args.map((x) => JSON.stringify(x)).join(', ')}`);
    throw error;
  }

  return stdout.toString('utf-8');
}

let gitShaCache: string | undefined;
async function _publishSnapshot(
  pkg: PackageInfo,
  branch: string,
  message: string,
  githubToken: string,
) {
  const snapshotRepo = monorepoData.packages[pkg.name]?.snapshotRepo;
  if (!snapshotRepo) {
    console.warn(`Skipping ${pkg.name}.`);

    return;
  }

  console.info(`Publishing ${pkg.name} to repo ${snapshotRepo}.`);

  const root = process.cwd();
  console.debug('Temporary directory: ' + root);

  const url = `https://${githubToken ? githubToken + '@' : ''}github.com/${snapshotRepo}.git`;
  const destPath = path.join(root, path.basename(snapshotRepo));

  _exec('git', ['clone', url], { cwd: root });
  if (branch) {
    // Try to checkout an existing branch, otherwise create it.
    try {
      _exec('git', ['checkout', branch], { cwd: destPath });
    } catch {
      _exec('git', ['checkout', '-b', branch], { cwd: destPath });
    }
  }

  // Clear snapshot directory before publishing to remove deleted build files.
  try {
    _exec('git', ['rm', '-rf', './'], { cwd: destPath });
  } catch {
    // Ignore errors on delete. :shrug:
  }
  _copy(path.join(__dirname, '../dist', pkg.name), destPath);

  if (githubToken) {
    _exec('git', ['config', 'commit.gpgSign', 'false'], { cwd: destPath });
  }

  // Add the header to the existing README.md (or create a README if it doesn't exist).
  const readmePath = path.join(destPath, 'README.md');
  let readme = readmeHeaderFn(pkg.name, snapshotRepo);
  try {
    readme += fs.readFileSync(readmePath, 'utf-8');
  } catch {}

  fs.writeFileSync(readmePath, readme);

  // Make sure that every snapshots is unique (otherwise we would need to make sure git accepts
  // empty commits).
  fs.writeFileSync(path.join(destPath, 'uniqueId'), '' + new Date());

  // Ensure we call git from within this repo
  gitShaCache ??= _exec('git', ['log', '--format=%h', '-n1'], { cwd: __dirname }).trim();

  // Commit and push.
  _exec('git', ['add', '.'], { cwd: destPath });
  _exec('git', ['commit', '-a', '-m', message], { cwd: destPath });
  _exec('git', ['tag', gitShaCache], { cwd: destPath });
  _exec('git', ['push', 'origin', branch], { cwd: destPath });
  _exec('git', ['push', '--tags', 'origin', branch], { cwd: destPath });
}

export interface SnapshotsOptions {
  force?: boolean;
  githubToken?: string;
  branch?: string;
}

export default async function (opts: SnapshotsOptions) {
  // Get the SHA.
  if (execSync(`git status --porcelain`).toString() && !opts.force) {
    console.error('You cannot run snapshots with local changes.');
    process.exit(1);
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'angular-cli-publish-'));
  const message = execSync(`git log --format="%h %s" -n1`).toString().trim();
  let branch = opts.branch || 'main';

  // CIRCLE_BRANCH
  if (typeof process.env['CIRCLE_BRANCH'] == 'string') {
    branch = '' + process.env['CIRCLE_BRANCH'];
  }

  const githubToken = (opts.githubToken || process.env.SNAPSHOT_BUILDS_GITHUB_TOKEN || '').trim();

  if (githubToken) {
    console.info('Setting up global git name.');
    _exec('git', ['config', '--global', 'user.email', 'dev-infra@angular.dev'], {});
    _exec('git', ['config', '--global', 'user.name', 'Angular Builds'], {});
    _exec('git', ['config', '--global', 'push.default', 'simple'], {});
  }

  // This is needed as otherwise when we run `devkit admin create` after `bazel build` the `dist`
  // will be overridden with the output of the legacy build.
  const temporaryProjectRoot = await createTemporaryProject();

  // Run build.
  console.info('Building...');
  await build({ snapshot: true });

  await jsonHelp({ temporaryProjectRoot });

  if (!githubToken) {
    console.info('No token given, skipping actual publishing...');

    return 0;
  }

  for (const pkg of packages) {
    process.chdir(root);
    await _publishSnapshot(pkg, branch, message, githubToken);
  }

  return 0;
}
