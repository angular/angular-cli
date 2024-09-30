/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuildOptions, Plugin } from 'esbuild';
import path from 'node:path';
import { NormalizedCachedOptions } from '../../../utils/normalize-cache';
import { PostcssConfiguration } from '../../../utils/postcss-configuration';
import { LoadResultCache } from '../load-result-cache';
import { createCssInlineFontsPlugin } from './css-inline-fonts-plugin';
import { CssStylesheetLanguage } from './css-language';
import { createCssResourcePlugin } from './css-resource-plugin';
import { LessStylesheetLanguage } from './less-language';
import { SassStylesheetLanguage } from './sass-language';
import { StylesheetPluginFactory } from './stylesheet-plugin-factory';

export interface BundleStylesheetOptions {
  workspaceRoot: string;
  optimization: boolean;
  inlineFonts: boolean;
  preserveSymlinks?: boolean;
  sourcemap: boolean | 'external' | 'inline' | 'linked';
  outputNames: { bundles: string; media: string };
  includePaths?: string[];
  externalDependencies?: string[];
  target: string[];
  tailwindConfiguration?: { file: string; package: string };
  postcssConfiguration?: PostcssConfiguration;
  publicPath?: string;
  cacheOptions: NormalizedCachedOptions;
}

export function createStylesheetBundleOptions(
  options: BundleStylesheetOptions,
  cache?: LoadResultCache,
  inlineComponentData?: Record<string, string>,
): BuildOptions & { plugins: NonNullable<BuildOptions['plugins']> } {
  // Ensure preprocessor include paths are absolute based on the workspace root
  const includePaths = options.includePaths?.map((includePath) =>
    path.resolve(options.workspaceRoot, includePath),
  );

  const pluginFactory = new StylesheetPluginFactory(
    {
      sourcemap: !!options.sourcemap,
      includePaths,
      inlineComponentData,
      tailwindConfiguration: options.tailwindConfiguration,
      postcssConfiguration: options.postcssConfiguration,
    },
    cache,
  );

  const plugins: Plugin[] = [
    pluginFactory.create(SassStylesheetLanguage),
    pluginFactory.create(LessStylesheetLanguage),
    pluginFactory.create(CssStylesheetLanguage),
    createCssResourcePlugin(cache),
  ];

  if (options.inlineFonts) {
    plugins.unshift(createCssInlineFontsPlugin({ cache, cacheOptions: options.cacheOptions }));
  }

  return {
    absWorkingDir: options.workspaceRoot,
    bundle: true,
    entryNames: options.outputNames.bundles,
    assetNames: options.outputNames.media,
    logLevel: 'silent',
    minify: options.optimization,
    metafile: true,
    sourcemap: options.sourcemap,
    outdir: options.workspaceRoot,
    write: false,
    platform: 'browser',
    target: options.target,
    preserveSymlinks: options.preserveSymlinks,
    external: options.externalDependencies,
    publicPath: options.publicPath,
    conditions: ['style', 'sass', 'less', options.optimization ? 'production' : 'development'],
    mainFields: ['style', 'sass'],
    // Unlike JS, CSS does not have implicit file extensions in the general case.
    // Preprocessor specific behavior is handled in each stylesheet language plugin.
    resolveExtensions: [],
    plugins,
  };
}
