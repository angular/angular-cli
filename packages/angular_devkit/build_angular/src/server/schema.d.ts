/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BrowserBuilderSchema,
  FileReplacement,
  OptimizationObject,
  SourceMapOptions,
} from '../browser/schema';

export interface BuildWebpackServerSchema {
  /**
   * The name of the TypeScript configuration file.
   */
  tsConfig: string;
  /**
   * Adds more details to output logging.
   */
  verbose: boolean;
  /**
   * Use a separate bundle containing code used across multiple bundles.
   */
  commonChunk?: boolean;
  /**
   * URL where files will be deployed.
   */
  deployUrl?: string;
  /**
   * Show circular dependency warnings on builds.
   */
  showCircularDependencies?: boolean;
  /**
   * Use a separate bundle containing only vendor libraries.
   */
  vendorChunk?: boolean;
  /**
   * Output sourcemaps.
   */
  sourceMap: SourceMapOptions;
  /**
   * Resolve vendor packages sourcemaps.
   * @deprecated use sourceMap.vendor
   */
  vendorSourceMap?: boolean;
  /**
   * Output in-file eval sourcemaps.
   * @deprecated
   */
  evalSourceMap?: boolean;
  /**
   * Path where output will be placed.
   */
  outputPath: string;
  /**
 * Path where style resources will be placed (Relative to outputPath).
 */
  resourcesOutputPath: string;
  /**
   * Generates a 'stats.json' file which can be analyzed using tools such as:
   * #webpack-bundle-analyzer' or https://webpack.github.io/analyse.
   */
  statsJson?: boolean;
  /**
   * How to handle missing translations for i18n.
   */
  i18nMissingTranslation?: string;
  /**
   * Available on server platform only. Which external dependencies to bundle into the module.
   * By default, all of node_modules will be kept as requires.
   */
  bundleDependencies?: BundleDependencies;
  /**
   * Enables optimization of the build output.
   */
  optimization?: OptimizationObject;
  /**
   * Log progress to the console while building.
   */
  progress?: boolean;
  /**
   * delete-output-path
   */
  deleteOutputPath?: boolean;
  /**
   * List of additional NgModule files that will be lazy loaded. Lazy router modules with be
   * discovered automatically.
   */
  lazyModules?: string[];
  /**
   * Replace files with other files in the build.
   */
  fileReplacements: FileReplacement[];
  /**
   * Define the output filename cache-busting hashing mode.
   */
  outputHashing?: OutputHashing;
  /**
   * Extract all licenses in a separate file, in the case of production builds only.
   */
  extractLicenses?: boolean;
  /**
   * Format of the localization file specified with --i18n-file.
   */
  i18nFormat?: string;
  /**
   * Locale to use for i18n.
   */
  i18nLocale?: string;
  /**
   * Run the TypeScript type checker in a forked process.
   */
  forkTypeChecker?: boolean;
  /**
   * The name of the main entry-point file.
   */
  main: string;
  /**
   * Localization file to use for i18n.
   */
  i18nFile?: string;
  /**
   * Options to pass to style preprocessors
   */
  stylePreprocessorOptions?: StylePreprocessorOptions;
  /**
   * Do not use the real path when resolving modules.
   */
  preserveSymlinks?: boolean;
  /**
   * Use file name for lazy loaded chunks.
   */
  namedChunks?: boolean;
  /**
   * Run build when files change.
   */
  watch?: boolean;
  /**
 * Enable and define the file watching poll time period in milliseconds.
 */
  poll?: number;
}

/**
 * Available on server platform only. Which external dependencies to bundle into the module.
 * By default, all of node_modules will be kept as requires.
 */
export enum BundleDependencies {
  All = 'all',
  None = 'none',
}

/**
 * Define the output filename cache-busting hashing mode.
 */
export enum OutputHashing {
  All = 'all',
  Bundles = 'bundles',
  Media = 'media',
  None = 'none',
}

/**
 * Options to pass to style preprocessors
 */
export interface StylePreprocessorOptions {
  /**
   * Paths to include. Paths will be resolved to project root.
   */
  includePaths?: string[];
}

export interface NormalizedServerBuilderServerSchema extends Pick<
  BuildWebpackServerSchema,
  Exclude<keyof BuildWebpackServerSchema, 'sourceMap' | 'optimization'>
  > {
  fileReplacements: CurrentFileReplacement[];
  sourceMap: NormalizedSourceMaps;
  optimization: NormalizedOptimization;
}
