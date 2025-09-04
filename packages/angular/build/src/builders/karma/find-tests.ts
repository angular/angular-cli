/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { PathLike, constants, promises as fs } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { glob, isDynamicPattern } from 'tinyglobby';
import { toPosixPath } from '../../utils/path';

/* Go through all patterns and find unique list of files */
export async function findTests(
  include: string[],
  exclude: string[],
  workspaceRoot: string,
  projectSourceRoot: string,
): Promise<string[]> {
  const matchingTestsPromises = include.map((pattern) =>
    findMatchingTests(pattern, exclude, workspaceRoot, projectSourceRoot),
  );
  const files = await Promise.all(matchingTestsPromises);

  // Unique file names
  return [...new Set(files.flat())];
}

interface TestEntrypointsOptions {
  projectSourceRoot: string;
  workspaceRoot: string;
  removeTestExtension?: boolean;
}

/** Generate unique bundle names for a set of test files. */
export function getTestEntrypoints(
  testFiles: string[],
  { projectSourceRoot, workspaceRoot, removeTestExtension }: TestEntrypointsOptions,
): Map<string, string> {
  const seen = new Set<string>();

  return new Map(
    Array.from(testFiles, (testFile) => {
      const relativePath = removeRoots(testFile, [projectSourceRoot, workspaceRoot])
        // Strip leading dots and path separators.
        .replace(/^[./\\]+/, '')
        // Replace any path separators with dashes.
        .replace(/[/\\]/g, '-');

      let fileName = basename(relativePath, extname(relativePath));
      if (removeTestExtension) {
        fileName = fileName.replace(/\.(spec|test)$/, '');
      }

      const baseName = `spec-${fileName}`;
      let uniqueName = baseName;
      let suffix = 2;
      while (seen.has(uniqueName)) {
        uniqueName = `${baseName}-${suffix}`.replace(/([^\w](?:spec|test))-([\d]+)$/, '-$2$1');
        ++suffix;
      }
      seen.add(uniqueName);

      return [uniqueName, testFile];
    }),
  );
}

const removeLeadingSlash = (pattern: string): string => {
  if (pattern.charAt(0) === '/') {
    return pattern.substring(1);
  }

  return pattern;
};

const removeRelativeRoot = (path: string, root: string): string => {
  if (path.startsWith(root)) {
    return path.substring(root.length);
  }

  return path;
};

function removeRoots(path: string, roots: string[]): string {
  for (const root of roots) {
    if (path.startsWith(root)) {
      return path.substring(root.length);
    }
  }

  return basename(path);
}

async function findMatchingTests(
  pattern: string,
  ignore: string[],
  workspaceRoot: string,
  projectSourceRoot: string,
): Promise<string[]> {
  // normalize pattern, glob lib only accepts forward slashes
  let normalizedPattern = toPosixPath(pattern);
  normalizedPattern = removeLeadingSlash(normalizedPattern);

  const relativeProjectRoot = toPosixPath(relative(workspaceRoot, projectSourceRoot) + '/');

  // remove relativeProjectRoot to support relative paths from root
  // such paths are easy to get when running scripts via IDEs
  normalizedPattern = removeRelativeRoot(normalizedPattern, relativeProjectRoot);

  // special logic when pattern does not look like a glob
  if (!isDynamicPattern(normalizedPattern)) {
    if (await isDirectory(join(projectSourceRoot, normalizedPattern))) {
      normalizedPattern = `${normalizedPattern}/**/*.spec.@(ts|tsx)`;
    } else {
      // see if matching spec file exists
      const fileExt = extname(normalizedPattern);
      // Replace extension to `.spec.ext`. Example: `src/app/app.component.ts`-> `src/app/app.component.spec.ts`
      const potentialSpec = join(
        projectSourceRoot,
        dirname(normalizedPattern),
        `${basename(normalizedPattern, fileExt)}.spec${fileExt}`,
      );

      if (await exists(potentialSpec)) {
        return [potentialSpec];
      }
    }
  }

  // normalize the patterns in the ignore list
  const normalizedIgnorePatternList = ignore.map((pattern: string) =>
    removeRelativeRoot(removeLeadingSlash(toPosixPath(pattern)), relativeProjectRoot),
  );

  return glob(normalizedPattern, {
    cwd: projectSourceRoot,
    absolute: true,
    ignore: ['**/node_modules/**', ...normalizedIgnorePatternList],
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
