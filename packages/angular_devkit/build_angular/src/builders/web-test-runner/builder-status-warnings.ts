/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { Schema as WtrBuilderOptions } from './schema';

const UNSUPPORTED_OPTIONS: Array<keyof WtrBuilderOptions> = [
  'main',
  'assets',
  'scripts',
  'styles',
  'inlineStyleLanguage',
  'stylePreprocessorOptions',
  'sourceMap',
  'progress',
  'poll',
  'preserveSymlinks',
  'browsers',
  'codeCoverage',
  'codeCoverageExclude',
  'fileReplacements',
  'webWorkerTsConfig',
  'watch',
];

/** Logs a warning for any unsupported options specified. */
export function logBuilderStatusWarnings(options: WtrBuilderOptions, ctx: BuilderContext) {
  // Validate supported options
  for (const unsupportedOption of UNSUPPORTED_OPTIONS) {
    const value = (options as unknown as WtrBuilderOptions)[unsupportedOption];

    if (value === undefined || value === false) {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      continue;
    }

    ctx.logger.warn(`The '${unsupportedOption}' option is not yet supported by this builder.`);
  }
}
