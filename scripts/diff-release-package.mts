/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Script that can be used to compare the local `npm_package` snapshot artifact
 * with the snapshot artifact from GitHub at upstream `HEAD`.
 *
 * This is useful during the `rules_js` migration to verify the npm artifact
 * doesn't differ unexpectedly.
 *
 * Example command: yarn diff-release-package @angular/cli
 */

import { GitClient } from '@angular/ng-dev';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sh from 'shelljs';

// Do not remove `.git` as we use Git for comparisons later.
// Also preserve `uniqueId` as it's irrelevant for the diff and not included via Bazel.
// The `README.md` is also put together outside of Bazel, so ignore it too.
const SKIP_FILES = ['README.md', 'uniqueId', '.git'];

const packageName = process.argv[2];
if (!packageName) {
  console.error('Expected package name to be specified.');
  process.exit(1);
}

try {
  await main(packageName);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}

async function main(packageName: string) {
  const bazel = process.env.BAZEL ?? 'bazel';
  const git = await GitClient.get();
  const monorepoData = JSON.parse(fs.readFileSync('./.monorepo.json', 'utf-8'));
  const targetDir = packageName.replace(/^@/g, '').replace(/-/g, '_');

  // `help/` is only generated in snapshots outside of Bazel. Ignore it when
  // diffing the Angular CLI package
  // https://github.com/angular/angular-cli/blob/main/scripts/json-help.mts#L16-L17.
  if (packageName === '@angular/cli') {
    SKIP_FILES.push('help');
  }

  const snapshotRepoName = monorepoData.packages[packageName]?.snapshotRepo;
  const tmpDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), `diff-release-package-${snapshotRepoName.replace(/\//g, '_')}`),
  );

  console.log(`Cloning snapshot repo (${snapshotRepoName}) into ${tmpDir}..`);
  git.run(['clone', `https://github.com/${snapshotRepoName}.git`, tmpDir]);
  console.log(`--> Cloned snapshot repo.`);

  const bazelBinDir = childProcess
    .spawnSync(bazel, ['info', 'bazel-bin'], {
      shell: true,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    .stdout.trim();
  if (bazelBinDir === '') {
    throw new Error('Could not determine bazel-bin directory.');
  }

  const outputPath = path.join(bazelBinDir, 'packages/', targetDir, 'npm_package');

  // Delete old directory to avoid surprises, or stamping being outdated.
  await deleteDir(outputPath);

  childProcess.spawnSync(
    bazel,
    ['build', `//packages/${targetDir}:npm_package`, '--config=snapshot'],
    {
      shell: true,
      stdio: 'inherit',
      encoding: 'utf8',
    },
  );

  console.log('--> Built npm package with --config=snapshot');
  console.error(`--> Output: ${outputPath}`);

  const removeTasks: Promise<void>[] = [];
  for (const subentry of await fs.promises.readdir(tmpDir)) {
    if (SKIP_FILES.includes(subentry)) {
      continue;
    }

    removeTasks.push(
      fs.promises.rm(path.join(tmpDir, subentry), { recursive: true, maxRetries: 3 }),
    );
  }
  await Promise.all(removeTasks);

  const copyTasks: Promise<void>[] = [];
  for (const subentry of await fs.promises.readdir(outputPath)) {
    if (SKIP_FILES.includes(subentry)) {
      continue;
    }

    copyTasks.push(
      fs.promises.cp(path.join(outputPath, subentry), path.join(tmpDir, subentry), {
        recursive: true,
      }),
    );
  }
  await Promise.all(copyTasks);

  git.run(['config', 'core.filemode', 'false'], { cwd: tmpDir });

  const diff = git.run(['diff', '--color'], { cwd: tmpDir }).stdout;

  console.log('\n\n----- Diff ------');
  console.log(diff);

  await deleteDir(tmpDir);
}

async function deleteDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  // Needed as Bazel artifacts are readonly and cannot be deleted otherwise.
  sh.chmod('-R', 'u+w', dirPath);
  await fs.promises.rm(dirPath, { recursive: true, force: true, maxRetries: 3 });
}
