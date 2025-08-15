/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview Script that takes a directory and converts all its Unix symlinks
 * to relative Windows-compatible symlinks. This is necessary because when building
 * tests via Bazel inside WSL; the output cannot simply be used outside WSL to perform
 * native Windows testing. This is a known limitation/bug of the WSL <> Windows interop.
 *
 * Symlinks are commonly used by Bazel inside the `.runfiles` directory, which is relevant
 * for executing tests outside Bazel on the host machine. In addition, `rules_js` heavily
 * relies on symlinks for node modules.
 *
 * Some more details in:
 *  - https://blog.trailofbits.com/2024/02/12/why-windows-cant-follow-wsl-symlinks/.
 *  - https://pnpm.io/symlinked-node-modules-structure.
 */

import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';

const [rootDir, cmdPath] = process.argv.slice(2);

const skipDirectories = [
  // Modules that we don't need and would unnecessarily slow-down this.
  '_windows_amd64/bin/nodejs/node_modules',
];

// Dereferencing can be parallelized and doesn't cause any WSL flakiness (no exe is invoked).
const dereferenceFns = [];
// Re-linking can be parallelized, but should only be in batched. WSL exe is involved and it can be flaky.
// Note: Relinking should not happen during removing & copying of dereference tasks.
const relinkFns = [];

async function transformDir(p) {
  // We explore directories after all files were checked at this level.
  const directoriesToVisit = [];

  for (const file of await fs.readdir(p, { withFileTypes: true })) {
    const subPath = path.join(p, file.name);
    if (skipDirectories.some((d) => subPath.endsWith(d))) {
      continue;
    }

    if (file.isSymbolicLink()) {
      let realTarget = '';
      let linkTarget = '';

      try {
        realTarget = await fs.realpath(subPath);
        linkTarget = await fs.readlink(subPath);
      } catch (e) {
        throw new Error(`Skipping; cannot dereference & read link: ${subPath}: ${e}`);
      }

      // Transform relative links but preserve them.
      // This is needed for pnpm.
      if (!path.isAbsolute(linkTarget)) {
        relinkFns.push(async () => {
          const wslSubPath = path.relative(rootDir, subPath).replace(/\//g, '\\');
          const linkTargetWindowsPath = linkTarget.replace(/\//g, '\\');

          await fs.unlink(subPath);

          if ((await fs.stat(realTarget)).isDirectory()) {
            // This is a symlink to a directory, create a dir junction.
            // Re-create this symlink on the Windows FS using the Windows mklink command.
            await exec(`${cmdPath} /c mklink /d "${wslSubPath}" "${linkTargetWindowsPath}"`);
          } else {
            // This is a symlink to a file, create a file junction.
            // Re-create this symlink on the Windows FS using the Windows mklink command.
            await exec(`${cmdPath} /c mklink "${wslSubPath}" "${linkTargetWindowsPath}"`);
          }
        });
      } else {
        dereferenceFns.push(async () => {
          await fs.unlink(subPath);
          // Note: NodeJS `fs.cp` can have issues when sources are readonly.
          await exec(`cp -R ${realTarget} ${subPath}`);
        });
      }
    } else if (file.isDirectory()) {
      directoriesToVisit.push(subPath);
    }
  }

  await Promise.all(directoriesToVisit.map((d) => transformDir(d)));
}

async function exec(cmd, maxRetries = 5, retryDelay = 100) {
  let attempts = 0;
  while (attempts <= maxRetries) {
    try {
      await new Promise((resolve, reject) => {
        childProcess.exec(cmd, { cwd: rootDir }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      return;
    } catch (error) {
      // Windows command spawned within WSL (which is untypical) seem to be flaky.
      // This logic tries to make it fully stable by re-trying if this surfaces:
      // See: https://github.com/microsoft/WSL/issues/8677.
      if (attempts < maxRetries && error.stderr?.includes('accept4 failed 110')) {
        // Add a delay before the next attempt
        await setTimeout(retryDelay);
        attempts++;
      } else {
        throw error;
      }
    }
  }
}

try {
  await transformDir(rootDir);

  // Dereference first.
  await Promise.all(dereferenceFns.map((fn) => fn()));

  // Re-link symlinks to work inside Windows.
  // This is done in batches to avoid flakiness due to WSL
  // See: https://github.com/microsoft/WSL/issues/8677.
  const batchSize = 50;
  for (let i = 0; i < relinkFns.length; i += batchSize) {
    await Promise.all(relinkFns.slice(i, i + batchSize).map((fn) => fn()));
  }
} catch (err) {
  console.error('Could not convert symlinks:', err);
  process.exitCode = 1;
}
