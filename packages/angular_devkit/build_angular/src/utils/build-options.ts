/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import type { ParsedConfiguration } from '@angular/compiler-cli';
import {
  AssetPatternClass,
  Budget,
  CrossOrigin,
  I18NTranslation,
  IndexUnion,
  InlineStyleLanguage,
  Localize,
  OutputHashing,
  ScriptElement,
  SourceMapClass,
  StyleElement,
} from '../builders/browser/schema';
import { Schema as DevServerSchema } from '../builders/dev-server/schema';
import { NormalizedCachedOptions } from './normalize-cache';
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
  localize?: Localize;
  i18nMissingTranslation?: I18NTranslation;
  externalDependencies?: string[];
  watch?: boolean;
  outputHashing?: OutputHashing;
  poll?: number;
  index?: IndexUnion;
  deleteOutputPath?: boolean;
  preserveSymlinks?: boolean;
  extractLicenses?: boolean;
  buildOptimizer?: boolean;
  namedChunks?: boolean;
  crossOrigin?: CrossOrigin;
  subresourceIntegrity?: boolean;
  serviceWorker?: boolean;
  webWorkerTsConfig?: string;
  statsJson: boolean;
  hmr?: boolean;
  main: string;
  polyfills: string[];
  budgets: Budget[];
  assets: AssetPatternClass[];
  scripts: ScriptElement[];
  styles: StyleElement[];
  stylePreprocessorOptions?: { includePaths: string[] };
  platform?: 'browser' | 'server';
  fileReplacements: NormalizedFileReplacement[];
  inlineStyleLanguage?: InlineStyleLanguage;
  allowedCommonJsDependencies?: string[];
  cache: NormalizedCachedOptions;
  codeCoverage?: boolean;
  codeCoverageExclude?: string[];
  supportedBrowsers?: string[];
}

export interface WebpackDevServerOptions
  extends BuildOptions,
    Omit<DevServerSchema, 'optimization' | 'sourceMap' | 'browserTarget'> {}

export interface WebpackConfigOptions<T = BuildOptions> {
  root: string;
  logger: logging.Logger;
  projectRoot: string;
  sourceRoot?: string;
  buildOptions: T;
  tsConfig: ParsedConfiguration;
  tsConfigPath: string;
  projectName: string;
}
