/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import type { BundleStylesheetOptions } from '../../../tools/esbuild/stylesheets/bundle-options';
import type { NormalizedLibraryOptions } from '../options';

export type LibraryStylesheetBundlerOptions = Pick<
  NormalizedLibraryOptions,
  | 'workspaceRoot'
  | 'preserveSymlinks'
  | 'styleIncludePaths'
  | 'sass'
  | 'cacheOptions'
  | 'inlineStyleLanguage'
  | 'postcssConfiguration'
  | 'tailwindConfiguration'
>;

/**
 * Creates a stylesheet bundler instance configured for library compilation.
 *
 * @param options The normalized library builder options.
 * @param incremental Whether incremental watch mode is enabled.
 * @param target The esbuild target environments derived from browserslist.
 * @returns A new ComponentStylesheetBundler instance.
 */
export function createComponentStylesheetBundlerForLibrary(
  options: LibraryStylesheetBundlerOptions,
  incremental: boolean,
  target: string[],
): ComponentStylesheetBundler {
  const {
    workspaceRoot,
    preserveSymlinks,
    styleIncludePaths,
    sass,
    cacheOptions,
    inlineStyleLanguage,
    postcssConfiguration,
    tailwindConfiguration,
  } = options;

  const bundleOptions: BundleStylesheetOptions = {
    workspaceRoot,
    optimization: true,
    inlineFonts: false,
    dataurl: true,
    target,
    preserveSymlinks,
    sourcemap: false,
    outputNames: { bundles: '[name]', media: 'media/[name]' },
    includePaths: styleIncludePaths,
    sass,
    cacheOptions,
    postcssConfiguration,
    tailwindConfiguration,
  };

  return new ComponentStylesheetBundler(bundleOptions, inlineStyleLanguage, incremental);
}
