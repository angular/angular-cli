/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ComponentStylesheetBundler } from '../../tools/esbuild/angular/component-stylesheets';
import { SourceFileCache } from '../../tools/esbuild/angular/source-file-cache';
import {
  createBrowserCodeBundleOptions,
  createBrowserPolyfillBundleOptions,
  createServerMainCodeBundleOptions,
  createServerPolyfillBundleOptions,
  createSsrEntryCodeBundleOptions,
} from '../../tools/esbuild/application-code-bundle';
import { BundlerContext } from '../../tools/esbuild/bundler-context';
import { createGlobalScriptsBundleOptions } from '../../tools/esbuild/global-scripts';
import { createGlobalStylesBundleOptions } from '../../tools/esbuild/global-styles';
import { getSupportedNodeTargets } from '../../tools/esbuild/utils';
import { NormalizedApplicationBuildOptions } from './options';

/**
 * Generates one or more BundlerContext instances based on the builder provided
 * configuration.
 * @param options The normalized application builder options to use.
 * @param browsers An string array of browserslist browsers to support.
 * @param codeBundleCache An instance of the TypeScript source file cache.
 * @returns An array of BundlerContext objects.
 */
export function setupBundlerContexts(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  codeBundleCache: SourceFileCache,
  stylesheetBundler: ComponentStylesheetBundler,
  templateUpdates: Map<string, string> | undefined,
): {
  typescriptContexts: BundlerContext[];
  otherContexts: BundlerContext[];
} {
  const {
    outputMode,
    serverEntryPoint,
    appShellOptions,
    prerenderOptions,
    ssrOptions,
    workspaceRoot,
    watch = false,
  } = options;
  const typescriptContexts = [];
  const otherContexts = [];

  // Browser application code
  typescriptContexts.push(
    new BundlerContext(
      workspaceRoot,
      watch,
      createBrowserCodeBundleOptions(
        options,
        target,
        codeBundleCache,
        stylesheetBundler,
        templateUpdates,
      ),
    ),
  );

  // Browser polyfills code
  const browserPolyfillBundleOptions = createBrowserPolyfillBundleOptions(
    options,
    target,
    codeBundleCache,
    stylesheetBundler,
  );
  if (browserPolyfillBundleOptions) {
    const browserPolyfillContext = new BundlerContext(
      workspaceRoot,
      watch,
      browserPolyfillBundleOptions,
    );
    if (typeof browserPolyfillBundleOptions === 'function') {
      otherContexts.push(browserPolyfillContext);
    } else {
      typescriptContexts.push(browserPolyfillContext);
    }
  }

  // Global Stylesheets
  if (options.globalStyles.length > 0) {
    for (const initial of [true, false]) {
      const bundleOptions = createGlobalStylesBundleOptions(options, target, initial);
      if (bundleOptions) {
        otherContexts.push(new BundlerContext(workspaceRoot, watch, bundleOptions, () => initial));
      }
    }
  }

  // Global Scripts
  if (options.globalScripts.length > 0) {
    for (const initial of [true, false]) {
      const bundleOptions = createGlobalScriptsBundleOptions(options, target, initial);
      if (bundleOptions) {
        otherContexts.push(new BundlerContext(workspaceRoot, watch, bundleOptions, () => initial));
      }
    }
  }

  // Skip server build when none of the features are enabled.
  if (serverEntryPoint && (outputMode || prerenderOptions || appShellOptions || ssrOptions)) {
    const nodeTargets = [...target, ...getSupportedNodeTargets()];

    typescriptContexts.push(
      new BundlerContext(
        workspaceRoot,
        watch,
        createServerMainCodeBundleOptions(options, nodeTargets, codeBundleCache, stylesheetBundler),
      ),
    );

    if (outputMode && ssrOptions?.entry) {
      // New behavior introduced: 'server.ts' is now bundled separately from 'main.server.ts'.
      typescriptContexts.push(
        new BundlerContext(
          workspaceRoot,
          watch,
          createSsrEntryCodeBundleOptions(options, nodeTargets, codeBundleCache, stylesheetBundler),
        ),
      );
    }

    // Server polyfills code
    const serverPolyfillBundleOptions = createServerPolyfillBundleOptions(
      options,
      nodeTargets,
      codeBundleCache.loadResultCache,
    );

    if (serverPolyfillBundleOptions) {
      otherContexts.push(new BundlerContext(workspaceRoot, watch, serverPolyfillBundleOptions));
    }
  }

  return { typescriptContexts, otherContexts };
}

export function createComponentStyleBundler(
  options: NormalizedApplicationBuildOptions,
  target: string[],
): ComponentStylesheetBundler {
  const {
    workspaceRoot,
    optimizationOptions,
    sourcemapOptions,
    outputNames,
    externalDependencies,
    preserveSymlinks,
    stylePreprocessorOptions,
    inlineStyleLanguage,
    cacheOptions,
    tailwindConfiguration,
    postcssConfiguration,
    publicPath,
  } = options;
  const incremental = !!options.watch;

  return new ComponentStylesheetBundler(
    {
      workspaceRoot,
      inlineFonts: !!optimizationOptions.fonts.inline,
      optimization: !!optimizationOptions.styles.minify,
      sourcemap:
        // Hidden component stylesheet sourcemaps are inaccessible which is effectively
        // the same as being disabled. Disabling has the advantage of avoiding the overhead
        // of sourcemap processing.
        sourcemapOptions.styles && !sourcemapOptions.hidden ? 'linked' : false,
      outputNames,
      includePaths: stylePreprocessorOptions?.includePaths,
      // string[] | undefined' is not assignable to type '(Version | DeprecationOrId)[] | undefined'.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sass: stylePreprocessorOptions?.sass as any,
      externalDependencies,
      target,
      preserveSymlinks,
      tailwindConfiguration,
      postcssConfiguration,
      cacheOptions,
      publicPath,
    },
    inlineStyleLanguage,
    incremental,
  );
}
