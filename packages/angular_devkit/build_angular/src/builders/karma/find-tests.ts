/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { PathLike, constants, promises as fs } from 'fs';
import glob, { hasMagic } from 'glob';
import { basename, dirname, extname, join, relative } from 'path';
import { promisify } from 'util';

const globPromise = promisify(glob);

// go through all patterns and find unique list of files
export async function findTests(
  patterns: string[],
  workspaceRoot: string,
  projectSourceRoot: string,
): Promise<string[]> {
  const matchingTestsPromises = patterns.map((pattern) =>
    findMatchingTests(pattern, workspaceRoot, projectSourceRoot),
  );
  const files = await Promise.all(matchingTestsPromises);

  // Unique file names
  return [...new Set(files.flat())];
}

const normalizePath = (path: string): string => path.replace(/\\/g, '/');

async function findMatchingTests(
  pattern: string,
  workspaceRoot: string,
  projectSourceRoot: string,
): Promise<string[]> {
  // normalize pattern, glob lib only accepts forward slashes
  let normalizedPattern = normalizePath(pattern);
  const relativeProjectRoot = normalizePath(relative(workspaceRoot, projectSourceRoot) + '/');

  // remove relativeProjectRoot to support relative paths from root
  // such paths are easy to get when running scripts via IDEs
  if (normalizedPattern.startsWith(relativeProjectRoot)) {
    normalizedPattern = normalizedPattern.substring(relativeProjectRoot.length);
  }

  // special logic when pattern does not look like a glob
  if (!hasMagic(normalizedPattern)) {
    if (await isDirectory(join(projectSourceRoot, normalizedPattern))) {
      normalizedPattern = `${normalizedPattern}/**/*.spec.@(ts|tsx)`;
    } else {
      // see if matching spec file exists
      const fileExt = extname(normalizedPattern);
      // Replace extension to `.spec.ext`. Example: `src/app/app.component.ts`-> `src/app/app.component.spec.ts`
      const potentialSpec = join(
        dirname(normalizedPattern),
        `${basename(normalizedPattern, fileExt)}.spec${fileExt}`,
      );

      if (await exists(join(projectSourceRoot, potentialSpec))) {
        return [normalizePath(potentialSpec)];
      }
    }
  }

  return globPromise(normalizedPattern, {
    cwd: projectSourceRoot,
  });
}

async function isDirectory(path: PathLike): Promise<boolean> {
  try {
    const stats = await fs.stat(path);

    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function exists(path: PathLike): Promise<boolean> {
  try {
    await fs.access(path, constants.F_OK);

    return true;
  } catch {
    return false;
  }
}
