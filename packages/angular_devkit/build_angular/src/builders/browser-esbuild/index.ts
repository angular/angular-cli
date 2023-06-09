/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { OutputFile } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SourceFileCache } from '../../tools/esbuild/angular/compiler-plugin';
import { createCodeBundleOptions } from '../../tools/esbuild/application-code-bundle';
import { BundlerContext } from '../../tools/esbuild/bundler-context';
import { ExecutionResult, RebuildState } from '../../tools/esbuild/bundler-execution-result';
import { checkCommonJSModules } from '../../tools/esbuild/commonjs-checker';
import { createGlobalScriptsBundleOptions } from '../../tools/esbuild/global-scripts';
import { createGlobalStylesBundleOptions } from '../../tools/esbuild/global-styles';
import { generateIndexHtml } from '../../tools/esbuild/index-html-generator';
import { extractLicenses } from '../../tools/esbuild/license-extractor';
import { shutdownSassWorkerPool } from '../../tools/esbuild/stylesheets/sass-language';
import {
  calculateEstimatedTransferSizes,
  logBuildStats,
  logMessages,
  withNoProgress,
  withSpinner,
  writeResultFiles,
} from '../../tools/esbuild/utils';
import { copyAssets } from '../../utils/copy-assets';
import { assertIsError } from '../../utils/error';
import { transformSupportedBrowsersToTargets } from '../../utils/esbuild-targets';
import { augmentAppWithServiceWorkerEsbuild } from '../../utils/service-worker';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { logBuilderStatusWarnings } from './builder-status-warnings';
import { BrowserEsbuildOptions, NormalizedBrowserOptions, normalizeOptions } from './options';
import { Schema as BrowserBuilderOptions } from './schema';

async function execute(
  options: NormalizedBrowserOptions,
  context: BuilderContext,
  rebuildState?: RebuildState,
): Promise<ExecutionResult> {
  const startTime = process.hrtime.bigint();

  const {
    projectRoot,
    workspaceRoot,
    optimizationOptions,
    assets,
    serviceWorkerOptions,
    indexHtmlOptions,
    cacheOptions,
  } = options;

  const browsers = getSupportedBrowsers(projectRoot, context.logger);
  const target = transformSupportedBrowsersToTargets(browsers);

  // Reuse rebuild state or create new bundle contexts for code and global stylesheets
  let bundlerContexts = rebuildState?.rebuildContexts;
  const codeBundleCache =
    rebuildState?.codeBundleCache ??
    new SourceFileCache(cacheOptions.enabled ? cacheOptions.path : undefined);
  if (bundlerContexts === undefined) {
    bundlerContexts = [];

    // Application code
    bundlerContexts.push(
      new BundlerContext(
        workspaceRoot,
        !!options.watch,
        createCodeBundleOptions(options, target, browsers, codeBundleCache),
      ),
    );

    // Global Stylesheets
    if (options.globalStyles.length > 0) {
      for (const initial of [true, false]) {
        const bundleOptions = createGlobalStylesBundleOptions(
          options,
          target,
          browsers,
          initial,
          codeBundleCache?.loadResultCache,
        );
        if (bundleOptions) {
          bundlerContexts.push(
            new BundlerContext(workspaceRoot, !!options.watch, bundleOptions, () => initial),
          );
        }
      }
    }

    // Global Scripts
    if (options.globalScripts.length > 0) {
      for (const initial of [true, false]) {
        const bundleOptions = createGlobalScriptsBundleOptions(options, initial);
        if (bundleOptions) {
          bundlerContexts.push(
            new BundlerContext(workspaceRoot, !!options.watch, bundleOptions, () => initial),
          );
        }
      }
    }
  }

  const bundlingResult = await BundlerContext.bundleAll(bundlerContexts);

  // Log all warnings and errors generated during bundling
  await logMessages(context, bundlingResult);

  const executionResult = new ExecutionResult(bundlerContexts, codeBundleCache);

  // Return if the bundling has errors
  if (bundlingResult.errors) {
    return executionResult;
  }

  const { metafile, initialFiles, outputFiles } = bundlingResult;

  executionResult.outputFiles.push(...outputFiles);

  // Check metafile for CommonJS module usage if optimizing scripts
  if (optimizationOptions.scripts) {
    const messages = checkCommonJSModules(metafile, options.allowedCommonJsDependencies);
    await logMessages(context, { warnings: messages });
  }

  // Generate index HTML file
  if (indexHtmlOptions) {
    const { errors, warnings, content } = await generateIndexHtml(
      initialFiles,
      executionResult,
      options,
    );
    for (const error of errors) {
      context.logger.error(error);
    }
    for (const warning of warnings) {
      context.logger.warn(warning);
    }

    executionResult.addOutputFile(indexHtmlOptions.output, content);
  }

  // Copy assets
  if (assets) {
    // The webpack copy assets helper is used with no base paths defined. This prevents the helper
    // from directly writing to disk. This should eventually be replaced with a more optimized helper.
    executionResult.assetFiles.push(...(await copyAssets(assets, [], workspaceRoot)));
  }

  // Write metafile if stats option is enabled
  if (options.stats) {
    executionResult.addOutputFile('stats.json', JSON.stringify(metafile, null, 2));
  }

  // Extract and write licenses for used packages
  if (options.extractLicenses) {
    executionResult.addOutputFile(
      '3rdpartylicenses.txt',
      await extractLicenses(metafile, workspaceRoot),
    );
  }

  // Augment the application with service worker support
  if (serviceWorkerOptions) {
    try {
      const serviceWorkerResult = await augmentAppWithServiceWorkerEsbuild(
        workspaceRoot,
        serviceWorkerOptions,
        options.baseHref || '/',
        executionResult.outputFiles,
        executionResult.assetFiles,
      );
      executionResult.addOutputFile('ngsw.json', serviceWorkerResult.manifest);
      executionResult.assetFiles.push(...serviceWorkerResult.assetFiles);
    } catch (error) {
      context.logger.error(error instanceof Error ? error.message : `${error}`);

      return executionResult;
    }
  }

  // Calculate estimated transfer size if scripts are optimized
  let estimatedTransferSizes;
  if (optimizationOptions.scripts || optimizationOptions.styles.minify) {
    estimatedTransferSizes = await calculateEstimatedTransferSizes(executionResult.outputFiles);
  }
  logBuildStats(context, metafile, initialFiles, estimatedTransferSizes);

  const buildTime = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
  context.logger.info(`Application bundle generation complete. [${buildTime.toFixed(3)} seconds]`);

  return executionResult;
}

/**
 * Main execution function for the esbuild-based application builder.
 * The options are compatible with the Webpack-based builder.
 * @param userOptions The browser builder options to use when setting up the application build
 * @param context The Architect builder context object
 * @returns An async iterable with the builder result output
 */
export function buildEsbuildBrowser(
  userOptions: BrowserBuilderOptions,
  context: BuilderContext,
  infrastructureSettings?: {
    write?: boolean;
  },
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: OutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
  return buildEsbuildBrowserInternal(userOptions, context, infrastructureSettings);
}

/**
 * Internal version of the main execution function for the esbuild-based application builder.
 * Exposes some additional "private" options in addition to those exposed by the schema.
 * @param userOptions The browser-esbuild builder options to use when setting up the application build
 * @param context The Architect builder context object
 * @returns An async iterable with the builder result output
 */
export async function* buildEsbuildBrowserInternal(
  userOptions: BrowserEsbuildOptions,
  context: BuilderContext,
  infrastructureSettings?: {
    write?: boolean;
  },
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: OutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
  // Inform user of status of builder and options
  logBuilderStatusWarnings(userOptions, context);

  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The 'browser-esbuild' builder requires a target to be specified.`);

    return;
  }

  const normalizedOptions = await normalizeOptions(context, projectName, userOptions);
  // Writing the result to the filesystem is the default behavior
  const shouldWriteResult = infrastructureSettings?.write !== false;

  if (shouldWriteResult) {
    // Clean output path if enabled
    if (userOptions.deleteOutputPath) {
      if (normalizedOptions.outputPath === normalizedOptions.workspaceRoot) {
        context.logger.error('Output path MUST not be workspace root directory!');

        return;
      }

      await fs.rm(normalizedOptions.outputPath, { force: true, recursive: true, maxRetries: 3 });
    }

    // Create output directory if needed
    try {
      await fs.mkdir(normalizedOptions.outputPath, { recursive: true });
    } catch (e) {
      assertIsError(e);
      context.logger.error('Unable to create output directory: ' + e.message);

      return;
    }
  }

  const withProgress: typeof withSpinner = normalizedOptions.progress
    ? withSpinner
    : withNoProgress;

  // Initial build
  let result: ExecutionResult;
  try {
    result = await withProgress('Building...', () => execute(normalizedOptions, context));

    if (shouldWriteResult) {
      // Write output files
      await writeResultFiles(result.outputFiles, result.assetFiles, normalizedOptions.outputPath);

      yield result.output;
    } else {
      // Requires casting due to unneeded `JsonObject` requirement. Remove once fixed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yield result.outputWithFiles as any;
    }

    // Finish if watch mode is not enabled
    if (!userOptions.watch) {
      return;
    }
  } finally {
    // Ensure Sass workers are shutdown if not watching
    if (!userOptions.watch) {
      shutdownSassWorkerPool();
    }
  }

  if (normalizedOptions.progress) {
    context.logger.info('Watch mode enabled. Watching for file changes...');
  }

  // Setup a watcher
  const { createWatcher } = await import('../../tools/esbuild/watcher');
  const watcher = createWatcher({
    polling: typeof userOptions.poll === 'number',
    interval: userOptions.poll,
    ignored: [
      // Ignore the output and cache paths to avoid infinite rebuild cycles
      normalizedOptions.outputPath,
      normalizedOptions.cacheOptions.basePath,
      // Ignore all node modules directories to avoid excessive file watchers.
      // Package changes are handled below by watching manifest and lock files.
      '**/node_modules/**',
      '**/.*/**',
    ],
  });

  // Temporarily watch the entire project
  watcher.add(normalizedOptions.projectRoot);

  // Watch workspace for package manager changes
  const packageWatchFiles = [
    // manifest can affect module resolution
    'package.json',
    // npm lock file
    'package-lock.json',
    // pnpm lock file
    'pnpm-lock.yaml',
    // yarn lock file including Yarn PnP manifest files (https://yarnpkg.com/advanced/pnp-spec/)
    'yarn.lock',
    '.pnp.cjs',
    '.pnp.data.json',
  ];
  watcher.add(packageWatchFiles.map((file) => path.join(normalizedOptions.workspaceRoot, file)));

  // Watch locations provided by the initial build result
  let previousWatchFiles = new Set(result.watchFiles);
  watcher.add(result.watchFiles);

  // Wait for changes and rebuild as needed
  try {
    for await (const changes of watcher) {
      if (userOptions.verbose) {
        context.logger.info(changes.toDebugString());
      }

      result = await withProgress('Changes detected. Rebuilding...', () =>
        execute(normalizedOptions, context, result.createRebuildState(changes)),
      );

      // Update watched locations provided by the new build result.
      // Add any new locations
      watcher.add(result.watchFiles.filter((watchFile) => !previousWatchFiles.has(watchFile)));
      const newWatchFiles = new Set(result.watchFiles);
      // Remove any old locations
      watcher.remove([...previousWatchFiles].filter((watchFile) => !newWatchFiles.has(watchFile)));
      previousWatchFiles = newWatchFiles;

      if (shouldWriteResult) {
        // Write output files
        await writeResultFiles(result.outputFiles, result.assetFiles, normalizedOptions.outputPath);

        yield result.output;
      } else {
        // Requires casting due to unneeded `JsonObject` requirement. Remove once fixed.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yield result.outputWithFiles as any;
      }
    }
  } finally {
    // Stop the watcher
    await watcher.close();
    // Cleanup incremental rebuild state
    await result.dispose();
    shutdownSassWorkerPool();
  }
}

export default createBuilder(buildEsbuildBrowser);
