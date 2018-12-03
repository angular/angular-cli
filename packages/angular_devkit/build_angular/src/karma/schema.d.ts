/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BrowserBuilderSchema } from '../browser/schema';

export interface KarmaBuilderSchema extends Pick<BrowserBuilderSchema,
  'assets' | 'main' | 'polyfills' | 'tsConfig' | 'scripts' | 'styles' | 'stylePreprocessorOptions'
  | 'fileReplacements' | 'poll' | 'preserveSymlinks' | 'watch' | 'vendorSourceMap'
  > {
  /**
   * The name of the Karma configuration file..
   */
  karmaConfig: string;

  /**
   * Output sourcemaps.
   */
  sourceMap: KarmaSourceMapOptions;

  /**
   * Override which browsers tests are run against.
   */
  browsers: string;

  /**
   * Output a code coverage report.
   */
  codeCoverage: boolean;

  /**
   * Globs to exclude from code coverage.
   */
  codeCoverageExclude: string[];

  /**
   * Karma reporters to use. Directly passed to the karma runner.
   */
  reporters?: string[];
}

export type KarmaSourceMapOptions = boolean | KarmaSourceMapObject;

export interface KarmaSourceMapObject {
  /** Resolve vendor packages sourcemaps */
  vendor?: boolean;
  /** Output sourcemaps for all scripts */
  scripts?: boolean;
  /** Output sourcemaps for all styles. */
  styles?: boolean;
}


export interface NormalizedKarmaBuilderSchema extends Pick<
  KarmaBuilderSchema,
  Exclude<keyof KarmaBuilderSchema, 'sourceMap' | 'vendorSourceMap'>
  > {
  assets: AssetPatternObject[];
  fileReplacements: CurrentFileReplacement[];
  sourceMap: NormalizedSourceMaps;
}
