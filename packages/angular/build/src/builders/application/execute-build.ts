/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { createAngularCompilation } from '../../tools/angular/compilation';
import { SourceFileCache } from '../../tools/esbuild/angular/source-file-cache';
import { generateBudgetStats } from '../../tools/esbuild/budget-stats';
import {
  BuildOutputFileType,
  BundleContextResult,
  BundlerContext,
} from '../../tools/esbuild/bundler-context';
import { ExecutionResult, RebuildState } from '../../tools/esbuild/bundler-execution-result';
import { checkCommonJSModules } from '../../tools/esbuild/commonjs-checker';
import { extractLicenses } from '../../tools/esbuild/license-extractor';
import { profileAsync } from '../../tools/esbuild/profiling';
import {
  calculateEstimatedTransferSizes,
  logBuildStats,
  transformSupportedBrowsersToTargets,
} from '../../tools/esbuild/utils';
import { BudgetCalculatorResult, checkBudgets } from '../../utils/bundle-calculator';
import { shouldOptimizeChunks } from '../../utils/environment-options';
import { resolveAssets } from '../../utils/resolve-assets';
import {
  SERVER_APP_ENGINE_MANIFEST_FILENAME,
  generateAngularServerAppEngineManifest,
} from '../../utils/server-rendering/manifest';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { executePostBundleSteps } from './execute-post-bundle';
import { inlineI18n, loadActiveTranslations } from './i18n';
import { NormalizedApplicationBuildOptions } from './options';
import { createComponentStyleBundler, setupBundlerContexts } from './setup-bundling';

// eslint-disable-next-line max-lines-per-function
export async function executeBuild(
  options: NormalizedApplicationBuildOptions,
  context: BuilderContext,
  rebuildState?: RebuildState,
): Promise<ExecutionResult> {
  const {
    projectRoot,
    workspaceRoot,
    i18nOptions,
    optimizationOptions,
    assets,
    cacheOptions,
    serverEntryPoint,
    baseHref,
    ssrOptions,
    verbose,
    colors,
    jsonLogs,
  } = options;

  // TODO: Consider integrating into watch mode. Would require full rebuild on target changes.
  const browsers = getSupportedBrowsers(projectRoot, context.logger);

  // Load active translations if inlining
  // TODO: Integrate into watch mode and only load changed translations
  if (i18nOptions.shouldInline) {
    await loadActiveTranslations(context, i18nOptions);
  }

  // Reuse rebuild state or create new bundle contexts for code and global stylesheets
  let bundlerContexts;
  let componentStyleBundler;
  let codeBundleCache;
  let bundlingResult: BundleContextResult;
  let templateUpdates: Map<string, string> | undefined;
  if (rebuildState) {
    bundlerContexts = rebuildState.rebuildContexts;
    componentStyleBundler = rebuildState.componentStyleBundler;
    codeBundleCache = rebuildState.codeBundleCache;
    templateUpdates = rebuildState.templateUpdates;
    // Reset template updates for new rebuild
    templateUpdates?.clear();

    const allFileChanges = rebuildState.fileChanges.all;

    // Bundle all contexts that do not require TypeScript changed file checks.
    // These will automatically use cached results based on the changed files.
    bundlingResult = await BundlerContext.bundleAll(bundlerContexts.otherContexts, allFileChanges);

    // Check the TypeScript code bundling cache for changes. If invalid, force a rebundle of
    // all TypeScript related contexts.
    const forceTypeScriptRebuild = codeBundleCache?.invalidate(allFileChanges);
    const typescriptResults: BundleContextResult[] = [];
    for (const typescriptContext of bundlerContexts.typescriptContexts) {
      typescriptContext.invalidate(allFileChanges);
      const result = await typescriptContext.bundle(forceTypeScriptRebuild);
      typescriptResults.push(result);
    }
    bundlingResult = BundlerContext.mergeResults([bundlingResult, ...typescriptResults]);
  } else {
    const target = transformSupportedBrowsersToTargets(browsers);
    codeBundleCache = new SourceFileCache(cacheOptions.enabled ? cacheOptions.path : undefined);
    componentStyleBundler = createComponentStyleBundler(options, target);
    if (options.templateUpdates) {
      templateUpdates = new Map<string, string>();
    }
    bundlerContexts = setupBundlerContexts(
      options,
      target,
      codeBundleCache,
      componentStyleBundler,
      // Create new reusable compilation for the appropriate mode based on the `jit` plugin option
      await createAngularCompilation(!!options.jit, !options.serverEntryPoint),
      templateUpdates,
    );

    // Bundle everything on initial build
    bundlingResult = await BundlerContext.bundleAll([
      ...bundlerContexts.typescriptContexts,
      ...bundlerContexts.otherContexts,
    ]);
  }

  // Update any external component styles if enabled and rebuilding.
  // TODO: Only attempt rebundling of invalidated styles once incremental build results are supported.
  if (rebuildState && options.externalRuntimeStyles) {
    componentStyleBundler.invalidate(rebuildState.fileChanges.all);

    const componentResults = await componentStyleBundler.bundleAllFiles(true, true);
    bundlingResult = BundlerContext.mergeResults([bundlingResult, ...componentResults]);
  }

  if (options.optimizationOptions.scripts && shouldOptimizeChunks) {
    const { optimizeChunks } = await import('./chunk-optimizer');
    bundlingResult = await profileAsync('OPTIMIZE_CHUNKS', () =>
      optimizeChunks(
        bundlingResult,
        options.sourcemapOptions.scripts ? !options.sourcemapOptions.hidden || 'hidden' : false,
      ),
    );
  }

  const executionResult = new ExecutionResult(
    bundlerContexts,
    componentStyleBundler,
    codeBundleCache,
    templateUpdates,
  );
  executionResult.addWarnings(bundlingResult.warnings);

  // Add used external component style referenced files to be watched
  if (options.externalRuntimeStyles) {
    executionResult.extraWatchFiles.push(...componentStyleBundler.collectReferencedFiles());
  }

  // Return if the bundling has errors
  if (bundlingResult.errors) {
    executionResult.addErrors(bundlingResult.errors);

    return executionResult;
  }

  // Analyze external imports if external options are enabled
  if (options.externalPackages || bundlingResult.externalConfiguration) {
    const {
      externalConfiguration,
      externalImports: { browser, server },
    } = bundlingResult;
    const implicitBrowser = browser ? [...browser] : [];
    const implicitServer = server ? [...server] : [];
    // TODO: Implement wildcard externalConfiguration filtering
    executionResult.setExternalMetadata(
      externalConfiguration
        ? implicitBrowser.filter((value) => !externalConfiguration.includes(value))
        : implicitBrowser,
      externalConfiguration
        ? implicitServer.filter((value) => !externalConfiguration.includes(value))
        : implicitServer,
      externalConfiguration,
    );
  }

  const { metafile, initialFiles, outputFiles } = bundlingResult;

  executionResult.outputFiles.push(...outputFiles);

  // Analyze files for bundle budget failures if present
  let budgetFailures: BudgetCalculatorResult[] | undefined;
  if (options.budgets) {
    const compatStats = generateBudgetStats(metafile, outputFiles, initialFiles);
    budgetFailures = [...checkBudgets(options.budgets, compatStats, true)];
    for (const { message, severity } of budgetFailures) {
      if (severity === 'error') {
        executionResult.addError(message);
      } else {
        executionResult.addWarning(message);
      }
    }
  }

  // Calculate estimated transfer size if scripts are optimized
  let estimatedTransferSizes;
  if (optimizationOptions.scripts || optimizationOptions.styles.minify) {
    estimatedTransferSizes = await calculateEstimatedTransferSizes(executionResult.outputFiles);
  }

  // Check metafile for CommonJS module usage if optimizing scripts
  if (optimizationOptions.scripts) {
    const messages = checkCommonJSModules(metafile, options.allowedCommonJsDependencies);
    executionResult.addWarnings(messages);
  }

  // Copy assets
  if (assets) {
    executionResult.addAssets(await resolveAssets(assets, workspaceRoot));
  }

  // Extract and write licenses for used packages
  if (options.extractLicenses) {
    executionResult.addOutputFile(
      '3rdpartylicenses.txt',
      await extractLicenses(metafile, workspaceRoot),
      BuildOutputFileType.Root,
    );
  }

  // Watch input index HTML file if configured
  if (options.indexHtmlOptions) {
    executionResult.extraWatchFiles.push(options.indexHtmlOptions.input);
    executionResult.htmlIndexPath = options.indexHtmlOptions.output;
    executionResult.htmlBaseHref = options.baseHref;
  }

  // Create server app engine manifest
  if (serverEntryPoint) {
    executionResult.addOutputFile(
      SERVER_APP_ENGINE_MANIFEST_FILENAME,
      generateAngularServerAppEngineManifest(i18nOptions, baseHref),
      BuildOutputFileType.ServerRoot,
    );
  }

  // Override auto-CSP settings if we are serving through Vite middleware.
  if (context.builder.builderName === 'dev-server' && options.security) {
    options.security.autoCsp = false;
  }

  // Perform i18n translation inlining if enabled
  if (i18nOptions.shouldInline) {
    const result = await inlineI18n(metafile, options, executionResult, initialFiles);
    executionResult.addErrors(result.errors);
    executionResult.addWarnings(result.warnings);
    executionResult.addPrerenderedRoutes(result.prerenderedRoutes);
  } else {
    const result = await executePostBundleSteps(
      metafile,
      options,
      executionResult.outputFiles,
      executionResult.assetFiles,
      initialFiles,
      // Set lang attribute to the defined source locale if present
      i18nOptions.hasDefinedSourceLocale ? i18nOptions.sourceLocale : undefined,
    );

    executionResult.addErrors(result.errors);
    executionResult.addWarnings(result.warnings);
    executionResult.addPrerenderedRoutes(result.prerenderedRoutes);
    executionResult.outputFiles.push(...result.additionalOutputFiles);
    executionResult.assetFiles.push(...result.additionalAssets);
  }

  executionResult.addOutputFile(
    'prerendered-routes.json',
    JSON.stringify({ routes: executionResult.prerenderedRoutes }, null, 2),
    BuildOutputFileType.Root,
  );

  // Write metafile if stats option is enabled
  if (options.stats) {
    executionResult.addOutputFile(
      'stats.json',
      JSON.stringify(metafile, null, 2),
      BuildOutputFileType.Root,
    );
  }

  if (!jsonLogs) {
    const changedFiles =
      rebuildState && executionResult.findChangedFiles(rebuildState.previousOutputInfo);
    executionResult.addLog(
      logBuildStats(
        metafile,
        outputFiles,
        initialFiles,
        budgetFailures,
        colors,
        changedFiles,
        estimatedTransferSizes,
        !!ssrOptions,
        verbose,
      ),
    );
  }

  return executionResult;
}
