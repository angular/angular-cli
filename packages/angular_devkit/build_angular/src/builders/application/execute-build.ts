/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { SourceFileCache } from '../../tools/esbuild/angular/source-file-cache';
import { generateBudgetStats } from '../../tools/esbuild/budget-stats';
import { BuildOutputFileType, BundlerContext } from '../../tools/esbuild/bundler-context';
import { ExecutionResult, RebuildState } from '../../tools/esbuild/bundler-execution-result';
import { checkCommonJSModules } from '../../tools/esbuild/commonjs-checker';
import { extractLicenses } from '../../tools/esbuild/license-extractor';
import { calculateEstimatedTransferSizes, logBuildStats } from '../../tools/esbuild/utils';
import { BudgetCalculatorResult, checkBudgets } from '../../utils/bundle-calculator';
import { copyAssets } from '../../utils/copy-assets';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { executePostBundleSteps } from './execute-post-bundle';
import { inlineI18n, loadActiveTranslations } from './i18n';
import { NormalizedApplicationBuildOptions } from './options';
import { setupBundlerContexts } from './setup-bundling';

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
    prerenderOptions,
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
  let bundlerContexts = rebuildState?.rebuildContexts;
  const codeBundleCache =
    rebuildState?.codeBundleCache ??
    new SourceFileCache(cacheOptions.enabled ? cacheOptions.path : undefined);
  if (bundlerContexts === undefined) {
    bundlerContexts = setupBundlerContexts(options, browsers, codeBundleCache);
  }

  const bundlingResult = await BundlerContext.bundleAll(
    bundlerContexts,
    rebuildState?.fileChanges.all,
  );

  const executionResult = new ExecutionResult(bundlerContexts, codeBundleCache);
  executionResult.addWarnings(bundlingResult.warnings);

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

  const changedFiles =
    rebuildState && executionResult.findChangedFiles(rebuildState.previousOutputHashes);

  // Analyze files for bundle budget failures if present
  let budgetFailures: BudgetCalculatorResult[] | undefined;
  if (options.budgets) {
    const compatStats = generateBudgetStats(metafile, initialFiles);
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
    // The webpack copy assets helper is used with no base paths defined. This prevents the helper
    // from directly writing to disk. This should eventually be replaced with a more optimized helper.
    executionResult.addAssets(await copyAssets(assets, [], workspaceRoot));
  }

  // Extract and write licenses for used packages
  if (options.extractLicenses) {
    executionResult.addOutputFile(
      '3rdpartylicenses.txt',
      await extractLicenses(metafile, workspaceRoot),
      BuildOutputFileType.Root,
    );
  }

  // Perform i18n translation inlining if enabled
  if (i18nOptions.shouldInline) {
    const result = await inlineI18n(options, executionResult, initialFiles);
    executionResult.addErrors(result.errors);
    executionResult.addWarnings(result.warnings);
    executionResult.addPrerenderedRoutes(result.prerenderedRoutes);
  } else {
    const result = await executePostBundleSteps(
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

  if (prerenderOptions) {
    const prerenderedRoutes = executionResult.prerenderedRoutes;
    executionResult.addOutputFile(
      'prerendered-routes.json',
      JSON.stringify({ routes: prerenderedRoutes }, null, 2),
      BuildOutputFileType.Root,
    );
  }

  // Write metafile if stats option is enabled
  if (options.stats) {
    executionResult.addOutputFile(
      'stats.json',
      JSON.stringify(metafile, null, 2),
      BuildOutputFileType.Root,
    );
  }

  if (!jsonLogs) {
    context.logger.info(
      logBuildStats(
        metafile,
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
