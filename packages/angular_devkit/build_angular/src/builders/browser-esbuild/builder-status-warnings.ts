/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { Schema as BrowserBuilderOptions } from './schema';

const UNSUPPORTED_OPTIONS: Array<keyof BrowserBuilderOptions> = [
  'budgets',

  // * Deprecated
  'deployUrl',

  // * Always enabled with esbuild
  // 'commonChunk',

  // * Unused by builder and will be removed in a future release
  'vendorChunk',
  'resourcesOutputPath',

  // * Currently unsupported by esbuild
  'webWorkerTsConfig',
];

export function logBuilderStatusWarnings(options: BrowserBuilderOptions, context: BuilderContext) {
  // Validate supported options
  for (const unsupportedOption of UNSUPPORTED_OPTIONS) {
    const value = (options as unknown as BrowserBuilderOptions)[unsupportedOption];

    if (value === undefined || value === false) {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      continue;
    }

    if (
      unsupportedOption === 'vendorChunk' ||
      unsupportedOption === 'resourcesOutputPath' ||
      unsupportedOption === 'deployUrl'
    ) {
      context.logger.warn(
        `The '${unsupportedOption}' option is not used by this builder and will be ignored.`,
      );
      continue;
    }

    context.logger.warn(`The '${unsupportedOption}' option is not yet supported by this builder.`);
  }
}
