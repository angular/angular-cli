/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BrowserBuilderSchema } from '../browser/schema';


// TODO: in TS 2.8 use Extract instead of Pick to make a subset of another type.
export interface KarmaBuilderSchema extends Pick<BrowserBuilderSchema,
  'assets' | 'main' | 'polyfills' | 'tsConfig' | 'scripts' | 'styles' | 'stylePreprocessorOptions'
  | 'fileReplacements' | 'sourceMap' | 'poll' | 'preserveSymlinks' | 'watch'
  > {
  /**
   * The name of the Karma configuration file..
   */
  karmaConfig: string;

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
