/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: cleanup this file, it's copied as is from Angular CLI.

import { logging } from '@angular-devkit/core';
import { ParsedConfiguration } from '@angular/compiler-cli';
import {
  AssetPatternClass,
  Budget,
  CrossOrigin,
  ExtraEntryPoint,
  I18NMissingTranslation,
  Localize,
  OptimizationClass,
  SourceMapClass,
} from '../../browser/schema';
import { NormalizedFileReplacement } from '../../utils/normalize-file-replacements';

export interface BuildOptions {
  optimization: OptimizationClass;
  environment?: string;
  outputPath: string;
  resourcesOutputPath?: string;
  aot?: boolean;
  sourceMap: SourceMapClass;
  /** @deprecated since version 8. use sourceMap instead. */
  vendorSourceMap?: boolean;
  /** @deprecated since version 8 */
  evalSourceMap?: boolean;
  vendorChunk?: boolean;
  commonChunk?: boolean;
  baseHref?: string;
  deployUrl?: string;
  verbose?: boolean;
  progress?: boolean;
  /** @deprecated since version 9. Use 'locales' object in the project metadata instead.*/
  i18nFile?: string;
  /** @deprecated since version 9. No longer needed as the format will be determined automatically.*/
  i18nFormat?: string;
  /** @deprecated since version 9. Use 'localize' instead.*/
  i18nLocale?: string;
  localize?: Localize;
  i18nMissingTranslation?: I18NMissingTranslation;
  extractCss?: boolean;
  bundleDependencies?: boolean;
  externalDependencies?: string[];
  watch?: boolean;
  outputHashing?: string;
  poll?: number;
  deleteOutputPath?: boolean;
  preserveSymlinks?: boolean;
  extractLicenses?: boolean;
  showCircularDependencies?: boolean;
  buildOptimizer?: boolean;
  namedChunks?: boolean;
  crossOrigin?: CrossOrigin;
  subresourceIntegrity?: boolean;
  serviceWorker?: boolean;
  webWorkerTsConfig?: string;
  /** @deprecated since version 8 **/
  skipAppShell?: boolean;
  statsJson: boolean;
  forkTypeChecker: boolean;
  profile?: boolean;
  /** @deprecated since version 8 **/
  es5BrowserSupport?: boolean;

  main: string;
  polyfills?: string;
  budgets: Budget[];
  assets: AssetPatternClass[];
  scripts: ExtraEntryPoint[];
  styles: ExtraEntryPoint[];
  stylePreprocessorOptions?: { includePaths: string[] };
  /** @deprecated SystemJsNgModuleLoader is deprecated, and this is part of its usage. */
  lazyModules: string[];
  platform?: 'browser' | 'server';
  fileReplacements: NormalizedFileReplacement[];
  /** @deprecated use only for compatibility in 8.x; will be removed in 9.0 */
  rebaseRootRelativeCssUrls?: boolean;

  /* Append script target version to filename. */
  esVersionInFileName?: boolean;
  experimentalRollupPass?: boolean;
  allowedCommonJsDependencies?: string[];
}

export interface WebpackTestOptions extends BuildOptions {
  codeCoverage?: boolean;
  codeCoverageExclude?: string[];
}

export interface WebpackConfigOptions<T = BuildOptions> {
  root: string;
  logger: logging.Logger;
  projectRoot: string;
  sourceRoot?: string;
  buildOptions: T;
  tsConfig: ParsedConfiguration;
  tsConfigPath: string;
  supportES2015: boolean;
  differentialLoadingMode?: boolean;
}
