/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { SourceFileCache } from '../../tools/esbuild/angular/source-file-cache';
import {
  createBrowserCodeBundleOptions,
  createBrowserPolyfillBundleOptions,
  createServerCodeBundleOptions,
  createServerPolyfillBundleOptions,
} from '../../tools/esbuild/application-code-bundle';
import { generateBudgetStats } from '../../tools/esbuild/budget-stats';
import { BuildOutputFileType, BundlerContext } from '../../tools/esbuild/bundler-context';
import { ExecutionResult, RebuildState } from '../../tools/esbuild/bundler-execution-result';
import { checkCommonJSModules } from '../../tools/esbuild/commonjs-checker';
import { createGlobalScriptsBundleOptions } from '../../tools/esbuild/global-scripts';
import { createGlobalStylesBundleOptions } from '../../tools/esbuild/global-styles';
import { extractLicenses } from '../../tools/esbuild/license-extractor';
import {
  calculateEstimatedTransferSizes,
  getSupportedNodeTargets,
  logBuildStats,
  logMessages,
  transformSupportedBrowsersToTargets,
} from '../../tools/esbuild/utils';
import { BudgetCalculatorResult, checkBudgets } from '../../utils/bundle-calculator';
import { colors } from '../../utils/color';
import { copyAssets } from '../../utils/copy-assets';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { executePostBundleSteps } from './execute-post-bundle';
import { inlineI18n, loadActiveTranslations } from './i18n';
import { NormalizedApplicationBuildOptions } from './options';

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
    serverEntryPoint,
    assets,
    cacheOptions,
    prerenderOptions,
    appShellOptions,
    ssrOptions,
  } = options;

  const browsers = getSupportedBrowsers(projectRoot, context.logger);
  const target = transformSupportedBrowsersToTargets(browsers);

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
    bundlerContexts = [];

    // Browser application code
    bundlerContexts.push(
      new BundlerContext(
        workspaceRoot,
        !!options.watch,
        createBrowserCodeBundleOptions(options, target, codeBundleCache),
      ),
    );

    // Browser polyfills code
    const browserPolyfillBundleOptions = createBrowserPolyfillBundleOptions(
      options,
      target,
      codeBundleCache,
    );
    if (browserPolyfillBundleOptions) {
      bundlerContexts.push(
        new BundlerContext(workspaceRoot, !!options.watch, browserPolyfillBundleOptions),
      );
    }

    // Global Stylesheets
    if (options.globalStyles.length > 0) {
      for (const initial of [true, false]) {
        const bundleOptions = createGlobalStylesBundleOptions(options, target, initial);
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
        const bundleOptions = createGlobalScriptsBundleOptions(options, target, initial);
        if (bundleOptions) {
          bundlerContexts.push(
            new BundlerContext(workspaceRoot, !!options.watch, bundleOptions, () => initial),
          );
        }
      }
    }

    // Skip server build when none of the features are enabled.
    if (serverEntryPoint && (prerenderOptions || appShellOptions || ssrOptions)) {
      const nodeTargets = [...target, ...getSupportedNodeTargets()];
      // Server application code
      bundlerContexts.push(
        new BundlerContext(
          workspaceRoot,
          !!options.watch,
          createServerCodeBundleOptions(
            {
              ...options,
              // Disable external deps for server bundles.
              // This is because it breaks Vite 'optimizeDeps' for SSR.
              externalPackages: false,
            },
            nodeTargets,
            codeBundleCache,
          ),
          () => false,
        ),
      );

      // Server polyfills code
      const serverPolyfillBundleOptions = createServerPolyfillBundleOptions(
        options,
        nodeTargets,
        codeBundleCache,
      );

      if (serverPolyfillBundleOptions) {
        bundlerContexts.push(
          new BundlerContext(
            workspaceRoot,
            !!options.watch,
            serverPolyfillBundleOptions,
            () => false,
          ),
        );
      }
    }
  }

  const bundlingResult = await BundlerContext.bundleAll(
    bundlerContexts,
    rebuildState?.fileChanges.all,
  );

  // Log all warnings and errors generated during bundling
  await logMessages(context, bundlingResult);

  const executionResult = new ExecutionResult(bundlerContexts, codeBundleCache);

  // Return if the bundling has errors
  if (bundlingResult.errors) {
    executionResult.addErrors(bundlingResult.errors);

    return executionResult;
  }

  // Analyze external imports if external options are enabled
  if (options.externalPackages || bundlingResult.externalConfiguration) {
    const { browser = new Set(), server = new Set() } = bundlingResult.externalImports;
    // TODO: Filter externalImports to generate third argument to support wildcard externalConfiguration values
    executionResult.setExternalMetadata(
      [...browser],
      [...server],
      bundlingResult.externalConfiguration,
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
    if (budgetFailures.length > 0) {
      const errors = budgetFailures
        .filter((failure) => failure.severity === 'error')
        .map(({ message }) => message);
      const warnings = budgetFailures
        .filter((failure) => failure.severity !== 'error')
        .map(({ message }) => message);

      await printWarningsAndErrorsToConsoleAndAddToResult(
        context,
        executionResult,
        warnings,
        errors,
      );
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
    await logMessages(context, { warnings: messages });
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
  let prerenderedRoutes: string[];
  let errors: string[];
  let warnings: string[];
  if (i18nOptions.shouldInline) {
    const result = await inlineI18n(options, executionResult, initialFiles);
    errors = result.errors;
    warnings = result.warnings;
    prerenderedRoutes = result.prerenderedRoutes;
  } else {
    const result = await executePostBundleSteps(
      options,
      executionResult.outputFiles,
      executionResult.assetFiles,
      initialFiles,
      // Set lang attribute to the defined source locale if present
      i18nOptions.hasDefinedSourceLocale ? i18nOptions.sourceLocale : undefined,
    );

    errors = result.errors;
    warnings = result.warnings;
    prerenderedRoutes = result.prerenderedRoutes;
    executionResult.outputFiles.push(...result.additionalOutputFiles);
    executionResult.assetFiles.push(...result.additionalAssets);
  }

  await printWarningsAndErrorsToConsoleAndAddToResult(context, executionResult, warnings, errors);

  if (prerenderOptions) {
    executionResult.addOutputFile(
      'prerendered-routes.json',
      JSON.stringify({ routes: prerenderedRoutes.sort((a, b) => a.localeCompare(b)) }, null, 2),
      BuildOutputFileType.Root,
    );

    let prerenderMsg = `Prerendered ${prerenderedRoutes.length} static route`;
    if (prerenderedRoutes.length > 1) {
      prerenderMsg += 's.';
    } else {
      prerenderMsg += '.';
    }

    context.logger.info(colors.magenta(prerenderMsg) + '\n');
  }

  logBuildStats(
    context,
    metafile,
    initialFiles,
    budgetFailures,
    changedFiles,
    estimatedTransferSizes,
  );

  // Write metafile if stats option is enabled
  if (options.stats) {
    executionResult.addOutputFile(
      'stats.json',
      JSON.stringify(metafile, null, 2),
      BuildOutputFileType.Root,
    );
  }

  return executionResult;
}

async function printWarningsAndErrorsToConsoleAndAddToResult(
  context: BuilderContext,
  executionResult: ExecutionResult,
  warnings: string[],
  errors: string[],
): Promise<void> {
  const errorMessages = errors.map((text) => ({ text, location: null }));
  if (errorMessages.length) {
    executionResult.addErrors(errorMessages);
  }

  await logMessages(context, {
    errors: errorMessages,
    warnings: warnings.map((text) => ({ text, location: null })),
  });
}
