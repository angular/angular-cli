/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import assert from 'node:assert';
import { SourceFileCache } from '../../tools/esbuild/angular/compiler-plugin';
import {
  createBrowserCodeBundleOptions,
  createServerCodeBundleOptions,
} from '../../tools/esbuild/application-code-bundle';
import { BundlerContext } from '../../tools/esbuild/bundler-context';
import { ExecutionResult, RebuildState } from '../../tools/esbuild/bundler-execution-result';
import { checkCommonJSModules } from '../../tools/esbuild/commonjs-checker';
import { createGlobalScriptsBundleOptions } from '../../tools/esbuild/global-scripts';
import { createGlobalStylesBundleOptions } from '../../tools/esbuild/global-styles';
import { generateIndexHtml } from '../../tools/esbuild/index-html-generator';
import { extractLicenses } from '../../tools/esbuild/license-extractor';
import {
  calculateEstimatedTransferSizes,
  logBuildStats,
  logMessages,
  transformSupportedBrowsersToTargets,
} from '../../tools/esbuild/utils';
import { copyAssets } from '../../utils/copy-assets';
import { maxWorkers } from '../../utils/environment-options';
import { augmentAppWithServiceWorkerEsbuild } from '../../utils/service-worker';
import { prerenderPages } from '../../utils/ssg/render';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { NormalizedApplicationBuildOptions } from './options';

// eslint-disable-next-line max-lines-per-function
export async function executeBuild(
  options: NormalizedApplicationBuildOptions,
  context: BuilderContext,
  rebuildState?: RebuildState,
): Promise<ExecutionResult> {
  const startTime = process.hrtime.bigint();

  const {
    projectRoot,
    workspaceRoot,
    serviceWorker,
    optimizationOptions,
    serverEntryPoint,
    assets,
    indexHtmlOptions,
    cacheOptions,
    prerenderOptions,
    appShellOptions,
    ssrOptions,
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

    // Browser application code
    bundlerContexts.push(
      new BundlerContext(
        workspaceRoot,
        !!options.watch,
        createBrowserCodeBundleOptions(options, target, codeBundleCache),
      ),
    );

    // Global Stylesheets
    if (options.globalStyles.length > 0) {
      for (const initial of [true, false]) {
        const bundleOptions = createGlobalStylesBundleOptions(
          options,
          target,
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

    // Server application code
    if (serverEntryPoint) {
      bundlerContexts.push(
        new BundlerContext(
          workspaceRoot,
          !!options.watch,
          createServerCodeBundleOptions(
            options,
            // NOTE: earlier versions of Node.js are not supported due to unsafe promise patching.
            // See: https://github.com/angular/angular/pull/50552#issue-1737967592
            [...target, 'node18.13'],
            codeBundleCache,
          ),
          () => false,
        ),
      );
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

  /**
   * Index HTML content without CSS inlining to be used for server rendering (AppShell, SSG and SSR).
   *
   * NOTE: we don't perform critical CSS inlining as this will be done during server rendering.
   */
  let indexContentOutputNoCssInlining: string | undefined;

  // Generate index HTML file
  if (indexHtmlOptions) {
    const { content, contentWithoutCriticalCssInlined, errors, warnings } = await generateIndexHtml(
      initialFiles,
      executionResult,
      {
        ...options,
        optimizationOptions,
      },
    );

    indexContentOutputNoCssInlining = contentWithoutCriticalCssInlined;
    printWarningsAndErrorsToConsole(context, warnings, errors);

    executionResult.addOutputFile(indexHtmlOptions.output, content);

    if (ssrOptions) {
      executionResult.addOutputFile('index.server.html', contentWithoutCriticalCssInlined);
    }
  }

  // Pre-render (SSG) and App-shell
  if (prerenderOptions || appShellOptions) {
    assert(
      indexContentOutputNoCssInlining,
      'The "index" option is required when using the "ssg" or "appShell" options.',
    );

    const { output, warnings, errors } = await prerenderPages(
      workspaceRoot,
      options.tsconfig,
      appShellOptions,
      prerenderOptions,
      executionResult.outputFiles,
      indexContentOutputNoCssInlining,
      optimizationOptions.styles.inlineCritical,
      maxWorkers,
    );

    printWarningsAndErrorsToConsole(context, warnings, errors);

    for (const [path, content] of Object.entries(output)) {
      executionResult.addOutputFile(path, content);
    }
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
  if (serviceWorker) {
    try {
      const serviceWorkerResult = await augmentAppWithServiceWorkerEsbuild(
        workspaceRoot,
        serviceWorker,
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

function printWarningsAndErrorsToConsole(
  context: BuilderContext,
  warnings: string[],
  errors: string[],
): void {
  for (const error of errors) {
    context.logger.error(error);
  }
  for (const warning of warnings) {
    context.logger.warn(warning);
  }
}
