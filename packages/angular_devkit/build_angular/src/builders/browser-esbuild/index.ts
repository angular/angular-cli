/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BuildOutputFile } from '../../tools/esbuild/bundler-context';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';
import { emitFilesToDisk } from '../../tools/esbuild/utils';
import { deleteOutputDir } from '../../utils';
import { buildApplicationInternal } from '../application';
import { Schema as ApplicationBuilderOptions, OutputPathClass } from '../application/schema';
import { logBuilderStatusWarnings } from './builder-status-warnings';
import { Schema as BrowserBuilderOptions } from './schema';

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
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: BuildOutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
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
    {
      write: false,
    },
    plugins && { codePlugins: plugins },
  )) {
    if (infrastructureSettings?.write !== false && result.outputFiles) {
      // Write output files
      await writeResultFiles(result.outputFiles, result.assetFiles, fullOutputPath);
    }

    // The builder system (architect) currently attempts to treat all results as JSON and
    // attempts to validate the object with a JSON schema validator. This can lead to slow
    // build completion (even after the actual build is fully complete) or crashes if the
    // size and/or quantity of output files is large. Architect only requires a `success`
    // property so that is all that will be passed here if the infrastructure settings have
    // not been explicitly set to avoid writes. Writing is only disabled when used directly
    // by the dev server which bypasses the architect behavior.
    const builderResult =
      infrastructureSettings?.write === false ? result : { success: result.success };
    yield builderResult;
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

// We write the file directly from this builder to maintain webpack output compatibility
// and not output browser files into '/browser'.
async function writeResultFiles(
  outputFiles: BuildOutputFile[],
  assetFiles: BuildOutputAsset[] | undefined,
  outputPath: string,
) {
  const directoryExists = new Set<string>();
  const ensureDirectoryExists = async (basePath: string) => {
    if (basePath && !directoryExists.has(basePath)) {
      await fs.mkdir(path.join(outputPath, basePath), { recursive: true });
      directoryExists.add(basePath);
    }
  };

  // Writes the output file to disk and ensures the containing directories are present
  await emitFilesToDisk(outputFiles, async (file: BuildOutputFile) => {
    // Ensure output subdirectories exist
    const basePath = path.dirname(file.path);
    await ensureDirectoryExists(basePath);

    // Write file contents
    await fs.writeFile(path.join(outputPath, file.path), file.contents);
  });

  if (assetFiles?.length) {
    await emitFilesToDisk(assetFiles, async ({ source, destination }) => {
      const basePath = path.dirname(destination);

      // Ensure output subdirectories exist
      await ensureDirectoryExists(basePath);

      // Copy file contents
      await fs.copyFile(source, path.join(outputPath, destination), fsConstants.COPYFILE_FICLONE);
    });
  }
}

export default createBuilder(buildEsbuildBrowser);
