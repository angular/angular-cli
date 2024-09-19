/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

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
import {
  getSupportedNodeTargets,
  transformSupportedBrowsersToTargets,
} from '../../tools/esbuild/utils';
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
  browsers: string[],
  codeBundleCache: SourceFileCache,
): BundlerContext[] {
  const {
    outputMode,
    serverEntryPoint,
    appShellOptions,
    prerenderOptions,
    ssrOptions,
    workspaceRoot,
    watch = false,
  } = options;
  const target = transformSupportedBrowsersToTargets(browsers);
  const bundlerContexts = [];

  // Browser application code
  bundlerContexts.push(
    new BundlerContext(
      workspaceRoot,
      watch,
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
    bundlerContexts.push(new BundlerContext(workspaceRoot, watch, browserPolyfillBundleOptions));
  }

  // Global Stylesheets
  if (options.globalStyles.length > 0) {
    for (const initial of [true, false]) {
      const bundleOptions = createGlobalStylesBundleOptions(options, target, initial);
      if (bundleOptions) {
        bundlerContexts.push(
          new BundlerContext(workspaceRoot, watch, bundleOptions, () => initial),
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
          new BundlerContext(workspaceRoot, watch, bundleOptions, () => initial),
        );
      }
    }
  }

  // Skip server build when none of the features are enabled.
  if (serverEntryPoint && (outputMode || prerenderOptions || appShellOptions || ssrOptions)) {
    const nodeTargets = [...target, ...getSupportedNodeTargets()];

    bundlerContexts.push(
      new BundlerContext(
        workspaceRoot,
        watch,
        createServerMainCodeBundleOptions(options, nodeTargets, codeBundleCache),
      ),
    );

    if (outputMode && ssrOptions?.entry) {
      // New behavior introduced: 'server.ts' is now bundled separately from 'main.server.ts'.
      bundlerContexts.push(
        new BundlerContext(
          workspaceRoot,
          watch,
          createSsrEntryCodeBundleOptions(options, nodeTargets, codeBundleCache),
        ),
      );
    }

    // Server polyfills code
    const serverPolyfillBundleOptions = createServerPolyfillBundleOptions(
      options,
      nodeTargets,
      codeBundleCache,
    );

    if (serverPolyfillBundleOptions) {
      bundlerContexts.push(new BundlerContext(workspaceRoot, watch, serverPolyfillBundleOptions));
    }
  }

  return bundlerContexts;
}
