/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type ApplicationBuilderOptions, buildApplication } from '@angular/build';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import { logBuilderStatusWarnings } from './builder-status-warnings';
import type { Schema as BrowserBuilderOptions } from './schema';

export type { BrowserBuilderOptions };

type OutputPathClass = Exclude<ApplicationBuilderOptions['outputPath'], string | undefined>;

/**
 * Main execution function for the esbuild-based application builder.
 * The options are compatible with the Webpack-based builder.
 * @param userOptions The browser builder options to use when setting up the application build
 * @param context The Architect builder context object
 * @returns An async iterable with the builder result output
 */
export async function* buildEsbuildBrowser(
  userOptions: BrowserBuilderOptions,
  context: BuilderContext,
  infrastructureSettings?: {
    write?: boolean;
  },
  plugins?: Plugin[],
): AsyncIterable<BuilderOutput> {
  // Inform user of status of builder and options
  logBuilderStatusWarnings(userOptions, context);

  const normalizedOptions = convertBrowserOptions(userOptions);
  yield* buildApplication(normalizedOptions, context, { codePlugins: plugins });
}

export function convertBrowserOptions(
  options: BrowserBuilderOptions,
): Omit<ApplicationBuilderOptions, 'outputPath'> & { outputPath: OutputPathClass } {
  const {
    main: browser,
    outputPath,
    ngswConfigPath,
    serviceWorker,
    polyfills,
    resourcesOutputPath,
    ...otherOptions
  } = options;

  return {
    browser,
    serviceWorker: serviceWorker ? ngswConfigPath : false,
    polyfills: typeof polyfills === 'string' ? [polyfills] : polyfills,
    outputPath: {
      base: outputPath,
      browser: '',
      server: '',
      media: resourcesOutputPath ?? 'media',
    },
    ...otherOptions,
  };
}

export default createBuilder<BrowserBuilderOptions>(buildEsbuildBrowser);
