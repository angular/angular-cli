/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import assert from 'assert';
import glob, { isDynamicPattern } from 'fast-glob';
import { PathLike, constants, promises as fs } from 'fs';
import { pluginName } from 'mini-css-extract-plugin';
import { basename, dirname, extname, join, relative } from 'path';
import type { Compilation, Compiler } from 'webpack';

/**
 * The name of the plugin provided to Webpack when tapping Webpack compiler hooks.
 */
const PLUGIN_NAME = 'angular-find-tests-plugin';

export interface FindTestsPluginOptions {
  include?: string[];
  exclude?: string[];
  workspaceRoot: string;
  projectSourceRoot: string;
}

export class FindTestsPlugin {
  private compilation: Compilation | undefined;

  constructor(private options: FindTestsPluginOptions) {}

  apply(compiler: Compiler): void {
    const {
      include = ['**/*.spec.ts'],
      exclude = [],
      projectSourceRoot,
      workspaceRoot,
    } = this.options;
    const webpackOptions = compiler.options;
    const entry =
      typeof webpackOptions.entry === 'function' ? webpackOptions.entry() : webpackOptions.entry;

    let originalImport: string[] | undefined;

    // Add tests files are part of the entry-point.
    webpackOptions.entry = async () => {
      const specFiles = await findTests(include, exclude, workspaceRoot, projectSourceRoot);
      const entrypoints = await entry;
      const entrypoint = entrypoints['main'];
      if (!entrypoint.import) {
        throw new Error(`Cannot find 'main' entrypoint.`);
      }

      if (specFiles.length) {
        originalImport ??= entrypoint.import;
        entrypoint.import = [...originalImport, ...specFiles];
      } else {
        assert(this.compilation, 'Compilation cannot be undefined.');
        this.compilation
          .getLogger(pluginName)
          .error(`Specified patterns: "${include.join(', ')}" did not match any spec files.`);
      }

      return entrypoints;
    };

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      this.compilation = compilation;
      compilation.contextDependencies.add(projectSourceRoot);
    });
  }
}

// go through all patterns and find unique list of files
async function findTests(
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

const normalizePath = (path: string): string => path.replace(/\\/g, '/');

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

async function findMatchingTests(
  pattern: string,
  ignore: string[],
  workspaceRoot: string,
  projectSourceRoot: string,
): Promise<string[]> {
  // normalize pattern, glob lib only accepts forward slashes
  let normalizedPattern = normalizePath(pattern);
  normalizedPattern = removeLeadingSlash(normalizedPattern);

  const relativeProjectRoot = normalizePath(relative(workspaceRoot, projectSourceRoot) + '/');

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
    removeRelativeRoot(removeLeadingSlash(normalizePath(pattern)), relativeProjectRoot),
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
