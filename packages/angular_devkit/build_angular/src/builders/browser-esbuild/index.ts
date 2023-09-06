/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { OutputFile } from 'esbuild';
import { buildApplicationInternal } from '../application';
import { Schema as ApplicationBuilderOptions } from '../application/schema';
import { logBuilderStatusWarnings } from './builder-status-warnings';
import { Schema as BrowserBuilderOptions } from './schema';

/**
 * Main execution function for the esbuild-based application builder.
 * The options are compatible with the Webpack-based builder.
 * @param userOptions The browser builder options to use when setting up the application build
 * @param context The Architect builder context object
 * @returns An async iterable with the builder result output
 */
export function buildEsbuildBrowser(
  userOptions: BrowserBuilderOptions,
  context: BuilderContext,
  infrastructureSettings?: {
    write?: boolean;
  },
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: OutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
  // Inform user of status of builder and options
  logBuilderStatusWarnings(userOptions, context);

  const normalizedOptions = normalizeOptions(userOptions);

  return buildApplicationInternal(normalizedOptions, context, infrastructureSettings);
}

function normalizeOptions(options: BrowserBuilderOptions): ApplicationBuilderOptions {
  const { main: browser, ngswConfigPath, serviceWorker, polyfills, ...otherOptions } = options;

  return {
    browser,
    serviceWorker: serviceWorker ? ngswConfigPath : false,
    polyfills: typeof polyfills === 'string' ? [polyfills] : polyfills,
    ...otherOptions,
  };
}

export default createBuilder(buildEsbuildBrowser);
