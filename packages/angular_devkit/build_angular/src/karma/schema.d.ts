/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  AssetPatternObject,
  BrowserBuilderSchema,
  CurrentFileReplacement,
  NormalizedSourceMaps,
  SourceMapUnion,
} from '../browser/schema';

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
  sourceMap: SourceMapUnion;

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
