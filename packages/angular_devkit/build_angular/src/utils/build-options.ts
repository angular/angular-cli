/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { ParsedConfiguration } from '@angular/compiler-cli';
import {
  AssetPatternClass,
  Budget,
  CrossOrigin,
  ExtraEntryPoint,
  I18NMissingTranslation,
  IndexUnion,
  Localize,
  SourceMapClass,
} from '../browser/schema';
import { Schema as DevServerSchema } from '../dev-server/schema';
import { NormalizedFileReplacement } from './normalize-file-replacements';
import { NormalizedOptimizationOptions } from './normalize-optimization';

export interface BuildOptions {
  optimization: NormalizedOptimizationOptions;
  environment?: string;
  outputPath: string;
  resourcesOutputPath?: string;
  aot?: boolean;
  sourceMap: SourceMapClass;
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
  /** @deprecated since version 11.0. No longer required to disable CSS extraction for HMR.*/
  extractCss?: boolean;
  bundleDependencies?: boolean;
  externalDependencies?: string[];
  watch?: boolean;
  outputHashing?: string;
  poll?: number;
  index?: IndexUnion;
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
  statsJson: boolean;
  forkTypeChecker: boolean;
  hmr?: boolean;
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

  experimentalRollupPass?: boolean;
  allowedCommonJsDependencies?: string[];

  differentialLoadingNeeded?: boolean;
}

export interface WebpackTestOptions extends BuildOptions {
  codeCoverage?: boolean;
  codeCoverageExclude?: string[];
}

export interface WebpackDevServerOptions extends BuildOptions, Omit<DevServerSchema, 'optimization' | 'sourceMap' | 'browserTarget'> { }

export interface WebpackConfigOptions<T = BuildOptions> {
  root: string;
  logger: logging.Logger;
  projectRoot: string;
  sourceRoot?: string;
  buildOptions: T;
  tsConfig: ParsedConfiguration;
  tsConfigPath: string;
  scriptTarget: import('typescript').ScriptTarget;
}
