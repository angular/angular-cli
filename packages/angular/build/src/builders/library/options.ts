/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import path from 'node:path';
import type { StylesheetPluginsass } from '../../tools/esbuild/stylesheets/stylesheet-plugin-factory';
import { supportColor } from '../../utils/color';
import { assertIsError } from '../../utils/error';
import { normalizeAssetPatterns } from '../../utils/normalize-asset-patterns';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { toPosixPath } from '../../utils/path';
import {
  generateSearchDirectories,
  getTailwindConfig,
  loadPostcssConfiguration,
} from '../../utils/postcss-configuration';
import { getProjectRootPaths } from '../../utils/project-metadata';
import { normalizeEntryPoints } from './pipeline/entry-points';
import { loadPackageJson } from './pipeline/utils';
import type { Schema as LibraryBuilderOptions } from './schema';
import type { NormalizedLibraryOptions, PackageJsonData } from './types';

/**
 * Normalizes raw library builder options into {@link NormalizedLibraryOptions} with all
 * file and directory paths normalized to POSIX format.
 *
 * @param context The Architect builder context.
 * @param projectName The name of the library project.
 * @param options The raw library builder schema options.
 * @returns A promise resolving to the normalized library options.
 */
export async function normalizeLibraryOptions(
  context: BuilderContext,
  projectName: string,
  options: LibraryBuilderOptions,
): Promise<NormalizedLibraryOptions> {
  const workspaceRoot = toPosixPath(context.workspaceRoot);
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRootPaths = getProjectRootPaths(workspaceRoot, projectMetadata);
  const projectRoot = toPosixPath(projectRootPaths.projectRoot);
  const projectSourceRoot = toPosixPath(projectRootPaths.projectSourceRoot);

  const {
    tsConfig,
    assets: rawAssets,
    stylePreprocessorOptions,
    inlineStyleLanguage = 'css',
    compilationMode,
    declarationMap,
    allowedNonPeerDependencies: rawAllowedNonPeerDependencies = [],
    keepLifecycleScripts = false,
    watch = false,
    poll,
    preserveSymlinks = process.execArgv.includes('--preserve-symlinks'),
    deleteOutputPath = true,
    progress = true,
    clearScreen,
  } = options;

  const resolvedTsConfigPath = toPosixPath(path.resolve(workspaceRoot, tsConfig));
  const packageJsonPath = path.posix.join(projectRoot, 'package.json');

  let packageJson: PackageJsonData;
  try {
    packageJson = await loadPackageJson(packageJsonPath);
  } catch (error) {
    assertIsError(error);
    throw new Error(`Failed to read 'package.json' at '${packageJsonPath}': ${error.message}`, {
      cause: error,
    });
  }

  const { name: packageName } = packageJson;
  if (!packageName) {
    throw new Error(`The package.json at '${packageJsonPath}' must contain a 'name'.`);
  }

  const entryPoints = normalizeEntryPoints(
    packageJson.exports,
    projectRoot,
    packageJsonPath,
    packageName,
  );

  const allowedNonPeerDependencies: RegExp[] = [/^tslib$/];
  for (const pattern of rawAllowedNonPeerDependencies) {
    try {
      allowedNonPeerDependencies.push(new RegExp(pattern));
    } catch (error) {
      assertIsError(error);
      throw new Error(
        `Invalid regular expression '${pattern}' in 'allowedNonPeerDependencies' for project '${projectName}': ${error.message}`,
        { cause: error },
      );
    }
  }

  const defaultAssets: (string | { glob: string; input: string; output: string })[] = [
    { glob: 'LICENSE*', input: projectRoot, output: '.' },
    { glob: 'README.md', input: projectRoot, output: '.' },
  ];

  const assets = normalizeAssetPatterns(
    [...defaultAssets, ...(rawAssets ?? [])],
    workspaceRoot,
    projectRoot,
    projectSourceRoot,
  ).map((asset) => ({
    ...asset,
    input: toPosixPath(path.resolve(workspaceRoot, asset.input)),
    output: toPosixPath(asset.output),
  }));

  const cacheOptions = normalizeCacheOptions(
    projectMetadata,
    workspaceRoot,
    projectName,
    context.builder.builderName,
  );

  const styleIncludePaths = (stylePreprocessorOptions?.includePaths ?? []).map((p: string) =>
    toPosixPath(path.resolve(workspaceRoot, p)),
  );

  const searchDirectories = await generateSearchDirectories([projectRoot, workspaceRoot]);
  const postcssConfiguration = await loadPostcssConfiguration(searchDirectories);
  const tailwindConfiguration = postcssConfiguration
    ? undefined
    : getTailwindConfig(searchDirectories, workspaceRoot, context.logger);

  return {
    workspaceRoot,
    projectRoot,
    packageName,
    packageJson,
    outputPath: toPosixPath(
      path.resolve(workspaceRoot, options.outputPath ?? path.posix.join('dist', projectName)),
    ),
    deleteOutputPath,
    packageJsonPath,
    tsConfigPath: resolvedTsConfigPath,
    entryPoints,
    inlineStyleLanguage,
    styleIncludePaths,
    sass: stylePreprocessorOptions?.sass as unknown as StylesheetPluginsass | undefined,
    assets,
    compilationMode,
    declarationMap,
    allowedNonPeerDependencies,
    keepLifecycleScripts,
    watch,
    poll,
    preserveSymlinks,
    progress,
    clearScreen,
    cacheOptions,
    colors: supportColor(),
    postcssConfiguration,
    tailwindConfiguration,
  };
}
