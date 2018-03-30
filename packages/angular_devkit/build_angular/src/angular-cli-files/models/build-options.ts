/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: cleanup this file, it's copied as is from Angular CLI.

// tslint:disable-next-line:no-implicit-dependencies
import * as ts from 'typescript';
import { Budget } from '../utilities/bundle-calculator';

export interface BuildOptions {
  optimization: boolean;
  environment?: string;
  outputPath: string;
  aot?: boolean;
  sourceMap?: boolean;
  evalSourceMap?: boolean;
  vendorChunk?: boolean;
  commonChunk?: boolean;
  baseHref?: string;
  deployUrl?: string;
  verbose?: boolean;
  progress?: boolean;
  i18nFile?: string;
  i18nFormat?: string;
  i18nOutFile?: string;
  i18nOutFormat?: string;
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

  main: string;
  index: string;
  polyfills?: string;
  budgets: Budget[];
  assets: AssetPattern[];
  scripts: ExtraEntryPoint[];
  styles: ExtraEntryPoint[];
  stylePreprocessorOptions: { includePaths: string[] };
  lazyModules: string[];
  platform?: 'browser' | 'server';
}

export interface AssetPattern {
  glob: string;
  input: string;
  output: string;
  allowOutsideOutDir?: boolean;
}

export interface ExtraEntryPoint {
  input: string;
  output?: string;
  lazy: boolean;
}

export interface WebpackConfigOptions<T extends BuildOptions = BuildOptions> {
  root: string;
  projectRoot: string;
  buildOptions: T;
  tsConfig: ts.ParsedCommandLine;
  tsConfigPath: string;
  supportES2015: boolean;
}

export interface WebpackTestOptions extends BuildOptions {
  codeCoverage?: boolean;
  codeCoverageExclude?: string[];
}
