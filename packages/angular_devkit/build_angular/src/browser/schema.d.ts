/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface BrowserBuilderSchema {
  /**
   * List of static application assets.
   */
  assets: AssetPattern[];

  /**
   * The name of the main entry-point file.
   */
  main: string;

  /**
   * The name of the polyfills file.
   */
  polyfills?: string;

  /**
   * The name of the TypeScript configuration file.
   */
  tsConfig: string;

  /**
   * Global scripts to be included in the build.
   */
  scripts: ExtraEntryPoint[];

  /**
   * Global styles to be included in the build.
   */
  styles: ExtraEntryPoint[];

  /**
   * Options to pass to style preprocessors.
   */
  stylePreprocessorOptions?: StylePreprocessorOptions;

  /**
   * Enables optimization of the build output.
   */
  optimization: boolean;

  /**
   * Replace files with other files in the build.
   */
  fileReplacements: FileReplacement[];

  /**
   * Path where output will be placed.
   */
  outputPath: string;

  /**
   * Build using Ahead of Time compilation.
   */
  aot: boolean;

  /**
   * Output sourcemaps.
   */
  sourceMap: boolean;

  /**
   * Resolve vendor packages sourcemaps.
   */
  vendorSourceMap?: boolean;

  /**
   * Output in-file eval sourcemaps.
   */
  evalSourceMap: boolean;

  /**
   * Use a separate bundle containing only vendor libraries.
   */
  vendorChunk: boolean;

  /**
   * Use a separate bundle containing code used across multiple bundles.
   */
  commonChunk: boolean;

  /**
   * Base url for the application being built.
   */
  baseHref?: string;

  /**
   * URL where files will be deployed.
   */
  deployUrl?: string;

  /**
   * Adds more details to output logging.
   */
  verbose: boolean;

  /**
   * Log progress to the console while building.
   */
  progress?: boolean;

  /**
   * Localization file to use for i18n.
   */
  i18nFile?: string;

  /**
   * Format of the localization file specified with --i18n-file.
   */
  i18nFormat?: string;

  /**
   * Locale to use for i18n.
   */
  i18nLocale?: string;

  /**
   * How to handle missing translations for i18n.
   */
  i18nMissingTranslation?: string;

  /**
   * Extract css from global styles onto css files instead of js ones.
   */
  extractCss: boolean;

  /**
   * Run build when files change.
   */
  watch: boolean;

  /**
   * Define the output filename cache-busting hashing mode.
   */
  outputHashing: OutputHashing;

  /**
   * Enable and define the file watching poll time period in milliseconds.
   */
  poll?: number;

  /**
   * Delete the output path before building.
   */
  deleteOutputPath: boolean;

  /**
   * Do not use the real path when resolving modules.
   */
  preserveSymlinks: boolean;

  /**
   * Extract all licenses in a separate file, in the case of production builds only.
   */
  extractLicenses: boolean;

  /**
   * Show circular dependency warnings on builds.
   */
  showCircularDependencies: boolean;

  /**
   * Enables @angular-devkit/build-optimizer optimizations when using the 'aot' option.
   */
  buildOptimizer: boolean;

  /**
   * Use file name for lazy loaded chunks.
   */
  namedChunks: boolean;

  /**
   * Enables the use of subresource integrity validation.
   */
  subresourceIntegrity: boolean;

  /**
   * Generates a service worker config for production builds.
   */
  serviceWorker: boolean;

  /**
   * Path to ngsw-config.json.
   */
  ngswConfigPath?: string;

  /**
   * Flag to prevent building an app shell.
   */
  skipAppShell: boolean;

  /**
   * The name of the index HTML file.
   */
  index: string;

  /**
   * Generates a 'stats.json' file which can be analyzed using tools
   * such as: #webpack-bundle-analyzer' or https: //webpack.github.io/analyse.
   */
  statsJson: boolean;

  /**
   * Run the TypeScript type checker in a forked process.
   */
  forkTypeChecker: boolean;

  /**
   * List of additional NgModule files that will be lazy loaded.
   * Lazy router modules with be discovered automatically.
   */
  lazyModules: string[];

  /**
   * Budget thresholds to ensure parts of your application stay within boundaries which you set.
   */
  budgets: Budget[];
}

export type AssetPattern = string | AssetPatternObject;

export interface AssetPatternObject {
  /**
   * The pattern to match.
   */
  glob: string;

  /**
   * The input path dir in which to apply 'glob'. Defaults to the project root.
   */
  input: string;

  /**
   * Absolute path within the output.
   */
  output: string;
}

export type ExtraEntryPoint = string | ExtraEntryPointObject;

export interface ExtraEntryPointObject {
  /**
   * The file to include.
   */
  input: string;

  /**
   * The bundle name for this extra entry point.
   */
  bundleName?: string;

  /**
   * If the bundle will be lazy loaded.
   */
  lazy: boolean;
}

export declare type FileReplacement = DeprecatedFileReplacment | CurrentFileReplacement;

export interface DeprecatedFileReplacment {
  /**
   * The file that should be replaced.
   */
  src: string;

  /**
   * The file that should replace.
   */
  replaceWith: string;
}

export interface CurrentFileReplacement {
  /**
   * The file that should be replaced.
   */
  replace: string;

  /**
   * The file that should replace.
   */
  with: string;
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
  includePaths: string[];
}

export interface Budget {
  /**
   * The type of budget.
   */
  type: BudgetType;

  /**
   * The name of the bundle.
   */
  name: string;

  /**
   * The baseline size for comparison.
   */
  baseline: string;

  /**
   * The maximum threshold for warning relative to the baseline.
   */
  maximumWarning: string;

  /**
   * The maximum threshold for error relative to the baseline.
   */
  maximumError: string;

  /**
   * The minimum threshold for warning relative to the baseline.
   */
  minimumWarning: string;

  /**
   * The minimum threshold for error relative to the baseline.
   */
  minimumError: string;

  /**
   * The threshold for warning relative to the baseline (min & max).
   */
  warning: string;

  /**
   * The threshold for error relative to the baseline (min & max).
   */
  error: string;
}

export enum BudgetType {
  Initial = 'initial',
  All = 'all',
  Any = 'any',
  AllScript = 'allScript',
  AnyScript = 'anyScript',
  Bundle = 'bundle',
}
