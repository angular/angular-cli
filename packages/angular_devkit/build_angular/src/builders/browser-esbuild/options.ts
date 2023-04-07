/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { normalizeAssetPatterns, normalizeOptimization, normalizeSourceMaps } from '../../utils';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { generateEntryPoints } from '../../utils/package-chunk-sort';
import { getIndexInputFile, getIndexOutputFile } from '../../utils/webpack-browser-config';
import { globalScriptsByBundleName, normalizeGlobalStyles } from '../../webpack/utils/helpers';
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
  const projectRoot = normalizeDirectoryPath(
    path.join(workspaceRoot, (projectMetadata.root as string | undefined) ?? ''),
  );
  const projectSourceRoot = normalizeDirectoryPath(
    path.join(workspaceRoot, (projectMetadata.sourceRoot as string | undefined) ?? 'src'),
  );

  const cacheOptions = normalizeCacheOptions(projectMetadata, workspaceRoot);

  const mainEntryPoint = path.join(workspaceRoot, options.main);
  const tsconfig = path.join(workspaceRoot, options.tsConfig);
  const outputPath = normalizeDirectoryPath(path.join(workspaceRoot, options.outputPath));
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

  const globalScripts: { name: string; files: string[]; initial: boolean }[] = [];
  if (options.scripts?.length) {
    for (const { bundleName, paths, inject } of globalScriptsByBundleName(options.scripts)) {
      globalScripts.push({ name: bundleName, files: paths, initial: inject });
    }
  }

  let tailwindConfiguration: { file: string; package: string } | undefined;
  const tailwindConfigurationPath = findTailwindConfigurationFile(workspaceRoot, projectRoot);
  if (tailwindConfigurationPath) {
    // Create a node resolver at the project root as a directory
    const resolver = createRequire(projectRoot + '/');
    try {
      tailwindConfiguration = {
        file: tailwindConfigurationPath,
        package: resolver.resolve('tailwindcss'),
      };
    } catch {
      const relativeTailwindConfigPath = path.relative(workspaceRoot, tailwindConfigurationPath);
      context.logger.warn(
        `Tailwind CSS configuration file found (${relativeTailwindConfigPath})` +
          ` but the 'tailwindcss' package is not installed.` +
          ` To enable Tailwind CSS, please install the 'tailwindcss' package.`,
      );
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
    allowedCommonJsDependencies,
    aot,
    baseHref,
    buildOptimizer,
    crossOrigin,
    externalDependencies,
    extractLicenses,
    inlineStyleLanguage = 'css',
    poll,
    polyfills,
    preserveSymlinks,
    statsJson,
    stylePreprocessorOptions,
    subresourceIntegrity,
    verbose,
    watch,
    progress,
  } = options;

  // Return all the normalized options
  return {
    advancedOptimizations: buildOptimizer,
    allowedCommonJsDependencies,
    baseHref,
    cacheOptions,
    crossOrigin,
    externalDependencies,
    extractLicenses,
    inlineStyleLanguage,
    jit: !aot,
    stats: !!statsJson,
    polyfills: polyfills === undefined || Array.isArray(polyfills) ? polyfills : [polyfills],
    poll,
    progress: progress ?? true,
    // If not explicitly set, default to the Node.js process argument
    preserveSymlinks: preserveSymlinks ?? process.execArgv.includes('--preserve-symlinks'),
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
    globalScripts,
    serviceWorkerOptions,
    indexHtmlOptions,
    tailwindConfiguration,
  };
}

function findTailwindConfigurationFile(
  workspaceRoot: string,
  projectRoot: string,
): string | undefined {
  // A configuration file can exist in the project or workspace root
  // The list of valid config files can be found:
  // https://github.com/tailwindlabs/tailwindcss/blob/8845d112fb62d79815b50b3bae80c317450b8b92/src/util/resolveConfigPath.js#L46-L52
  const tailwindConfigFiles = ['tailwind.config.js', 'tailwind.config.cjs'];
  for (const basePath of [projectRoot, workspaceRoot]) {
    for (const configFile of tailwindConfigFiles) {
      // Project level configuration should always take precedence.
      const fullPath = path.join(basePath, configFile);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return undefined;
}

/**
 * Normalize a directory path string.
 * Currently only removes a trailing slash if present.
 * @param path A path string.
 * @returns A normalized path string.
 */
function normalizeDirectoryPath(path: string): string {
  const last = path[path.length - 1];
  if (last === '/' || last === '\\') {
    return path.slice(0, -1);
  }

  return path;
}
