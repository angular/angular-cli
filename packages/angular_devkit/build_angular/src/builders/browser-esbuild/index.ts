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
  // Warn about any unsupported options
  if (userOptions['vendorChunk']) {
    context.logger.warn(
      `The 'vendorChunk' option is not used by this builder and will be ignored.`,
    );
  }
  if (userOptions['commonChunk'] === false) {
    context.logger.warn(
      `The 'commonChunk' option is always enabled by this builder and will be ignored.`,
    );
  }
  if (userOptions['webWorkerTsConfig']) {
    context.logger.warn(`The 'webWorkerTsConfig' option is not yet supported by this builder.`);
  }

  // Convert browser builder options to application builder options
  const normalizedOptions = convertBrowserOptions(userOptions);

  // Execute the application builder
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
