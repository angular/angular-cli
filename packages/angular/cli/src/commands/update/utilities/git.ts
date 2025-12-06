/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';

/**
 * Checks if the git repository is clean.
 * @param root The root directory of the project.
 * @returns True if the repository is clean, false otherwise.
 */
export function checkCleanGit(root: string): boolean {
  try {
    const topLevel = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const result = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
    if (result.trim().length === 0) {
      return true;
    }

    // Only files inside the workspace root are relevant
    for (const entry of result.split('\n')) {
      const relativeEntry = path.relative(
        path.resolve(root),
        path.resolve(topLevel.trim(), entry.slice(3).trim()),
      );

      if (!relativeEntry.startsWith('..') && !path.isAbsolute(relativeEntry)) {
        return false;
      }
    }
  } catch {} // eslint-disable-line no-empty

  return true;
}

/**
 * Checks if the working directory has pending changes to commit.
 * @returns Whether or not the working directory has Git changes to commit.
 */
export function hasChangesToCommit(): boolean {
  // List all modified files not covered by .gitignore.
  // If any files are returned, then there must be something to commit.

  return execSync('git ls-files -m -d -o --exclude-standard').toString() !== '';
}

/**
 * Stages all changes in the Git working tree and creates a new commit.
 * @param message The commit message to use.
 */
export function createCommit(message: string) {
  // Stage entire working tree for commit.
  execSync('git add -A', { encoding: 'utf8', stdio: 'pipe' });

  // Commit with the message passed via stdin to avoid bash escaping issues.
  execSync('git commit --no-verify -F -', { encoding: 'utf8', stdio: 'pipe', input: message });
}

/**
 * Finds the Git SHA hash of the HEAD commit.
 * @returns The Git SHA hash of the HEAD commit. Returns null if unable to retrieve the hash.
 */
export function findCurrentGitSha(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

/**
 * Gets the short hash of a commit.
 * @param commitHash The full commit hash.
 * @returns The short hash (first 9 characters).
 */
export function getShortHash(commitHash: string): string {
  return commitHash.slice(0, 9);
}
