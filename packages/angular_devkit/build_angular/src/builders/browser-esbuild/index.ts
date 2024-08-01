/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ApplicationBuilderOptions } from '@angular/build';
import {
  Result,
  ResultKind,
  buildApplicationInternal,
  deleteOutputDir,
  emitFilesToDisk,
} from '@angular/build/private';
import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logBuilderStatusWarnings } from './builder-status-warnings';
import type { Schema as BrowserBuilderOptions } from './schema';

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
): AsyncIterable<Result> {
  // Inform user of status of builder and options
  logBuilderStatusWarnings(userOptions, context);
  const normalizedOptions = normalizeOptions(userOptions);
  const { deleteOutputPath, outputPath } = normalizedOptions;
  const fullOutputPath = path.join(context.workspaceRoot, outputPath.base);

  if (deleteOutputPath && infrastructureSettings?.write !== false) {
    await deleteOutputDir(context.workspaceRoot, outputPath.base);
  }

  for await (const result of buildApplicationInternal(
    normalizedOptions,
    context,
    plugins && { codePlugins: plugins },
  )) {
    // Write the file directly from this builder to maintain webpack output compatibility
    // and not output browser files into '/browser'.
    if (
      infrastructureSettings?.write !== false &&
      (result.kind === ResultKind.Full || result.kind === ResultKind.Incremental)
    ) {
      const directoryExists = new Set<string>();
      // Writes the output file to disk and ensures the containing directories are present
      await emitFilesToDisk(Object.entries(result.files), async ([filePath, file]) => {
        // Ensure output subdirectories exist
        const basePath = path.dirname(filePath);
        if (basePath && !directoryExists.has(basePath)) {
          await fs.mkdir(path.join(fullOutputPath, basePath), { recursive: true });
          directoryExists.add(basePath);
        }

        if (file.origin === 'memory') {
          // Write file contents
          await fs.writeFile(path.join(fullOutputPath, filePath), file.contents);
        } else {
          // Copy file contents
          await fs.copyFile(
            file.inputPath,
            path.join(fullOutputPath, filePath),
            fs.constants.COPYFILE_FICLONE,
          );
        }
      });
    }

    yield result;
  }
}

function normalizeOptions(
  options: BrowserBuilderOptions,
): Omit<ApplicationBuilderOptions, 'outputPath'> & { outputPath: OutputPathClass } {
  const {
    main: browser,
    outputPath,
    ngswConfigPath,
    serviceWorker,
    polyfills,
    ...otherOptions
  } = options;

  return {
    browser,
    serviceWorker: serviceWorker ? ngswConfigPath : false,
    polyfills: typeof polyfills === 'string' ? [polyfills] : polyfills,
    outputPath: {
      base: outputPath,
      browser: '',
    },
    ...otherOptions,
  };
}

export async function* buildEsbuildBrowserArchitect(
  options: BrowserBuilderOptions,
  context: BuilderContext,
) {
  for await (const result of buildEsbuildBrowser(options, context)) {
    yield { success: result.kind !== ResultKind.Failure };
  }
}

export default createBuilder<BrowserBuilderOptions>(buildEsbuildBrowserArchitect);
