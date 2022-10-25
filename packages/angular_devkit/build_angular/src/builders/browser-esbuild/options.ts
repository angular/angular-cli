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
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { normalizePolyfills } from '../../utils/normalize-polyfills';
import { generateEntryPoints } from '../../utils/package-chunk-sort';
import { getIndexInputFile, getIndexOutputFile } from '../../utils/webpack-browser-config';
import { normalizeGlobalStyles } from '../../webpack/utils/helpers';
import { Schema as BrowserBuilderOptions, OutputHashing } from './schema';

export type NormalizedBrowserOptions = Awaited<ReturnType<typeof normalizeOptions>>;

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

  const cacheOptions = normalizeCacheOptions(projectMetadata, workspaceRoot);

  const mainEntryPoint = path.join(workspaceRoot, options.main);

  // Currently esbuild do not support multiple files per entry-point
  const [polyfillsEntryPoint, ...remainingPolyfills] = normalizePolyfills(
    options.polyfills,
    workspaceRoot,
  );

  if (remainingPolyfills.length) {
    context.logger.warn(
      `The 'polyfills' option currently does not support multiple entries by this experimental builder. The first entry will be used.`,
    );
  }

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

  let fileReplacements: Record<string, string> | undefined;
  if (options.fileReplacements) {
    for (const replacement of options.fileReplacements) {
      fileReplacements ??= {};
      fileReplacements[path.join(workspaceRoot, replacement.replace)] = path.join(
        workspaceRoot,
        replacement.with,
      );
    }
  }

  const globalStyles: { name: string; files: string[]; initial: boolean }[] = [];
  if (options.styles?.length) {
    const { entryPoints: stylesheetEntrypoints, noInjectNames } = normalizeGlobalStyles(
      options.styles || [],
    );
    for (const [name, files] of Object.entries(stylesheetEntrypoints)) {
      globalStyles.push({ name, files, initial: !noInjectNames.includes(name) });
    }
  }

  let serviceWorkerOptions;
  if (options.serviceWorker) {
    // If ngswConfigPath is not specified, the default is 'ngsw-config.json' within the project root
    serviceWorkerOptions = options.ngswConfigPath
      ? path.join(workspaceRoot, options.ngswConfigPath)
      : path.join(projectRoot, 'ngsw-config.json');
  }

  // Setup bundler entry points
  const entryPoints: Record<string, string> = {
    main: mainEntryPoint,
  };
  if (polyfillsEntryPoint) {
    entryPoints['polyfills'] = polyfillsEntryPoint;
  }

  let indexHtmlOptions;
  if (options.index) {
    indexHtmlOptions = {
      input: path.join(workspaceRoot, getIndexInputFile(options.index)),
      // The output file will be created within the configured output path
      output: getIndexOutputFile(options.index),
      // TODO: Use existing information from above to create the insertion order
      insertionOrder: generateEntryPoints({
        scripts: options.scripts ?? [],
        styles: options.styles ?? [],
      }),
    };
  }

  // Initial options to keep
  const {
    baseHref,
    buildOptimizer,
    crossOrigin,
    externalDependencies,
    poll,
    preserveSymlinks,
    stylePreprocessorOptions,
    subresourceIntegrity,
    verbose,
    watch,
  } = options;

  // Return all the normalized options
  return {
    advancedOptimizations: buildOptimizer,
    baseHref,
    cacheOptions,
    crossOrigin,
    externalDependencies,
    poll,
    preserveSymlinks,
    stylePreprocessorOptions,
    subresourceIntegrity,
    verbose,
    watch,
    workspaceRoot,
    entryPoints,
    optimizationOptions,
    outputPath,
    sourcemapOptions,
    tsconfig,
    projectRoot,
    assets,
    outputNames,
    fileReplacements,
    globalStyles,
    serviceWorkerOptions,
    indexHtmlOptions,
  };
}
