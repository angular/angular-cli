/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: cleanup this file, it's copied as is from Angular CLI.

import { logging } from '@angular-devkit/core';
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import {
  AssetPatternObject,
  Budget,
  CurrentFileReplacement,
  ExtraEntryPoint,
} from '../../browser/schema';

export interface BuildOptions {
  optimization: boolean;
  environment?: string;
  outputPath: string;
  aot?: boolean;
  sourceMap?: boolean;
  vendorSourceMap?: boolean;
  evalSourceMap?: boolean;
  vendorChunk?: boolean;
  commonChunk?: boolean;
  baseHref?: string;
  deployUrl?: string;
  verbose?: boolean;
  progress?: boolean;
  i18nFile?: string;
  i18nFormat?: string;
  i18nLocale?: string;
  i18nMissingTranslation?: string;
  extractCss?: boolean;
  bundleDependencies?: 'none' | 'all';
  watch?: boolean;
  outputHashing?: string;
  poll?: number;
  app?: string;
  deleteOutputPath?: boolean;
  preserveSymlinks?: boolean;
  extractLicenses?: boolean;
  showCircularDependencies?: boolean;
  buildOptimizer?: boolean;
  namedChunks?: boolean;
  subresourceIntegrity?: boolean;
  serviceWorker?: boolean;
  skipAppShell?: boolean;
  statsJson: boolean;
  forkTypeChecker: boolean;
  profile?: boolean;

  main: string;
  index: string;
  polyfills?: string;
  budgets: Budget[];
  assets: AssetPatternObject[];
  scripts: ExtraEntryPoint[];
  styles: ExtraEntryPoint[];
  stylePreprocessorOptions?: { includePaths: string[] };
  lazyModules: string[];
  platform?: 'browser' | 'server';
  fileReplacements: CurrentFileReplacement[];
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
  tsConfig: ts.ParsedCommandLine;
  tsConfigPath: string;
  supportES2015: boolean;
}
