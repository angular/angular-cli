/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import * as path from 'path';
import { normalizeAssetPatterns, normalizeOptimization, normalizeSourceMaps } from '../../utils';
import { Schema as BrowserBuilderOptions, OutputHashing } from '../browser/schema';

/**
 * Normalize the user provided options by creating full paths for all path based options
 * and converting multi-form options into a single form that can be directly used
 * by the build process.
 *
 * @param context The context for current builder execution.
 * @param projectName The name of the project for the current execution.
 * @param options An object containing the options to use for the build.
 * @returns An object containing normalized options required to perform the build.
 */
export async function normalizeOptions(
  context: BuilderContext,
  projectName: string,
  options: BrowserBuilderOptions,
) {
  const workspaceRoot = context.workspaceRoot;
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = path.join(workspaceRoot, (projectMetadata.root as string | undefined) ?? '');
  const projectSourceRoot = path.join(
    workspaceRoot,
    (projectMetadata.sourceRoot as string | undefined) ?? 'src',
  );

  // Normalize options
  const mainEntryPoint = path.join(workspaceRoot, options.main);
  const polyfillsEntryPoint = options.polyfills && path.join(workspaceRoot, options.polyfills);
  const tsconfig = path.join(workspaceRoot, options.tsConfig);
  const outputPath = path.join(workspaceRoot, options.outputPath);
  const optimizationOptions = normalizeOptimization(options.optimization);
  const sourcemapOptions = normalizeSourceMaps(options.sourceMap ?? false);
  const assets = options.assets?.length
    ? normalizeAssetPatterns(options.assets, workspaceRoot, projectRoot, projectSourceRoot)
    : undefined;

  const outputNames = {
    bundles:
      options.outputHashing === OutputHashing.All || options.outputHashing === OutputHashing.Bundles
        ? '[name].[hash]'
        : '[name]',
    media:
      options.outputHashing === OutputHashing.All || options.outputHashing === OutputHashing.Media
        ? '[name].[hash]'
        : '[name]',
  };
  if (options.resourcesOutputPath) {
    outputNames.media = path.join(options.resourcesOutputPath, outputNames.media);
  }

  // Setup bundler entry points
  const entryPoints: Record<string, string> = {
    main: mainEntryPoint,
  };
  if (polyfillsEntryPoint) {
    entryPoints['polyfills'] = polyfillsEntryPoint;
  }
  // Create reverse lookup used during index HTML generation
  const entryPointNameLookup: ReadonlyMap<string, string> = new Map(
    Object.entries(entryPoints).map(
      ([name, filePath]) => [path.relative(workspaceRoot, filePath), name] as const,
    ),
  );

  return {
    workspaceRoot,
    entryPoints,
    entryPointNameLookup,
    optimizationOptions,
    outputPath,
    sourcemapOptions,
    tsconfig,
    projectRoot,
    assets,
    outputNames,
  };
}
