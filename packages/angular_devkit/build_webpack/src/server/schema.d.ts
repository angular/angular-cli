/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface BuildWebpackServerSchema {
  /**
   * The name of the TypeScript configuration file.
   */
  tsConfig: string;
  /**
   * Output sourcemaps.
   */
  sourceMap?: boolean;
  /**
   * Adds more details to output logging.
   */
  verbose?: boolean;
  /**
   * Use a separate bundle containing code used across multiple bundles.
   */
  commonChunk?: boolean;
  /**
   * Show circular dependency warnings on builds.
   */
  showCircularDependencies?: boolean;
  /**
   * Use a separate bundle containing only vendor libraries.
   */
  vendorChunk?: boolean;
  /**
   * Output in-file eval sourcemaps.
   */
  evalSourceMap?: boolean;
  /**
   * Path where output will be placed.
   */
  outputPath: string;
  /**
   * Generates a 'stats.json' file which can be analyzed using tools such as:
   * #webpack-bundle-analyzer' or https: //webpack.github.io/analyse.
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
   * Defines the optimization level of the build.
   */
  optimization?: boolean;
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
   * Defines the build environment.
   */
  environment?: string;
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
