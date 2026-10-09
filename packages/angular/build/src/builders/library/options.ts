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
import { normalizeAssetPatterns } from '../../utils';
import { supportColor } from '../../utils/color';
import { assertIsError } from '../../utils/error';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
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

export async function normalizeLibraryOptions(
  context: BuilderContext,
  projectName: string,
  options: LibraryBuilderOptions,
): Promise<NormalizedLibraryOptions> {
  const { workspaceRoot } = context;
  const projectMetadata = await context.getProjectMetadata(projectName);
  const { projectRoot, projectSourceRoot } = getProjectRootPaths(workspaceRoot, projectMetadata);

  const {
    tsConfig,
    assets: rawAssets,
    stylePreprocessorOptions,
    inlineStyleLanguage = 'css',
    compilationMode = 'partial',
    declarationMap = false,
    allowedNonPeerDependencies: rawAllowedNonPeerDependencies = [],
    keepLifecycleScripts = false,
    watch = false,
    poll,
    preserveSymlinks = process.execArgv.includes('--preserve-symlinks'),
    deleteOutputPath = true,
    progress = true,
    clearScreen,
  } = options;

  const resolvedTsConfigPath = path.resolve(workspaceRoot, tsConfig);
  const packageJsonPath = path.join(projectRoot, 'package.json');

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

  for (const entryPoint of entryPoints.values()) {
    if (entryPoint.isPrimary) {
      continue;
    }
    defaultAssets.push({
      glob: 'README.md',
      input: path.dirname(entryPoint.entryFilePath),
      output: entryPoint.name,
    });
  }

  const assets = normalizeAssetPatterns(
    [...defaultAssets, ...(rawAssets ?? [])],
    workspaceRoot,
    projectRoot,
    projectSourceRoot,
  );

  const cacheOptions = normalizeCacheOptions(
    projectMetadata,
    workspaceRoot,
    projectName,
    context.builder.builderName,
  );

  const styleIncludePaths = (stylePreprocessorOptions?.includePaths ?? []).map((p: string) =>
    path.resolve(workspaceRoot, p),
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
    outputPath: path.resolve(workspaceRoot, options.outputPath ?? path.join('dist', projectName)),
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
