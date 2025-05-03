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

import path from 'node:path';
import fs from 'node:fs/promises';
import childProcess from 'node:child_process';

const [rootDir, cmdPath] = process.argv.slice(2);

// GitHub actions can set this environment variable when pressing the "re-run" button.
const debug = process.env.ACTIONS_STEP_DEBUG === 'true';
const skipDirectories = [
  // Modules that we don't need and would unnecessarily slow-down this.
  '_windows_amd64/bin/nodejs/node_modules',
];

const workspaceRootPaths = [/.*\.runfiles\/_main\//, /^.*-fastbuild\/bin\//];

// Copying can be parallelized and doesn't cause any WSL flakiness (no exe is invoked).
const parallelCopyTasks = [];

async function transformDir(p) {
  // We perform all command executions in parallel here to speed up.
  // Note that we can't parallelize for the full recursive directory,
  // as WSL and its interop would otherwise end up with some flaky errors.
  // See: https://github.com/microsoft/WSL/issues/8677.
  const tasks = [];
  // We explore directories after all files were checked at this level.
  const directoriesToVisit = [];

  for (const file of await fs.readdir(p, { withFileTypes: true })) {
    const subPath = path.join(p, file.name);

    if (skipDirectories.some((d) => subPath.endsWith(d))) {
      continue;
    }

    if (file.isSymbolicLink()) {
      // Allow for parallel processing of directory entries.
      tasks.push(
        (async () => {
          let target = '';
          try {
            target = await fs.realpath(subPath);
          } catch (e) {
            if (debug) {
              console.error('Skipping', subPath);
            }
            return;
          }

          await fs.rm(subPath);

          const subPathId = relativizeForSimilarWorkspacePaths(subPath);
          const targetPathId = relativizeForSimilarWorkspacePaths(target);
          const isSelfLink = subPathId === targetPathId;

          // This is an actual file that needs to be copied. Copy contents.
          //   - the target path is equivalent to the link. This is a self-link from `.runfiles` to `bin/`.
          //   - the target path is outside any of our workspace roots.
          if (isSelfLink || targetPathId.startsWith('..')) {
            parallelCopyTasks.push(exec(`cp -Rf ${target} ${subPath}`));
            return;
          }

          const relativeSubPath = relativizeToRoot(subPath);
          const targetAtDestination = path.relative(path.dirname(subPathId), targetPathId);
          const targetAtDestinationWindowsPath = targetAtDestination.replace(/\//g, '\\');

          const wslSubPath = relativeSubPath.replace(/\//g, '\\');

          if (debug) {
            console.log({
              targetAtDestination,
              subPath,
              relativeSubPath,
              target,
              targetPathId,
              subPathId,
            });
          }

          if ((await fs.stat(target)).isDirectory()) {
            // This is a symlink to a directory, create a dir junction.
            // Re-create this symlink on the Windows FS using the Windows mklink command.
            await exec(
              `${cmdPath} /c mklink /d "${wslSubPath}" "${targetAtDestinationWindowsPath}"`,
            );
          } else {
            // This is a symlink to a file, create a file junction.
            // Re-create this symlink on the Windows FS using the Windows mklink command.
            await exec(`${cmdPath} /c mklink "${wslSubPath}" "${targetAtDestinationWindowsPath}"`);
          }
        })(),
      );
    } else if (file.isDirectory()) {
      directoriesToVisit.push(subPath);
    }
  }

  // Wait for all commands/tasks to complete, executed in parallel.
  await Promise.all(tasks);

  // Descend into other directories, sequentially to avoid WSL interop errors.
  for (const d of directoriesToVisit) {
    await transformDir(d);
  }
}

function exec(cmd, maxRetries = 2) {
  return new Promise((resolve, reject) => {
    childProcess.exec(cmd, { cwd: rootDir }, (error) => {
      if (error !== null) {
        // Windows command spawned within WSL (which is untypical) seem to be flaky rarely.
        // This logic tries to make it fully stable by re-trying if this surfaces:
        // See: https://github.com/microsoft/WSL/issues/8677.
        if (
          maxRetries > 0 &&
          error.stderr !== undefined &&
          error.stderr.includes(`accept4 failed 110`)
        ) {
          resolve(exec(cmd, maxRetries - 1));
          return;
        }

        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function relativizeForSimilarWorkspacePaths(p) {
  const workspaceRootMatch = workspaceRootPaths.find((r) => r.test(p));
  if (workspaceRootMatch !== undefined) {
    return p.replace(workspaceRootMatch, '');
  }

  return path.relative(rootDir, p);
}

function relativizeToRoot(p) {
  const res = path.relative(rootDir, p);
  if (!res.startsWith('..')) {
    return res;
  }

  throw new Error('Could not relativize to root: ' + p);
}

try {
  await transformDir(rootDir);
  await Promise.all(parallelCopyTasks);
} catch (err) {
  console.error('Could not convert symlinks:', err);
  process.exitCode = 1;
}
