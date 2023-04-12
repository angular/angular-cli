/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { buildEsbuildBrowserInternal } from '../browser-esbuild';
import { BrowserEsbuildOptions } from '../browser-esbuild/options';
import { OutputHashing } from '../browser-esbuild/schema';
import { normalizeOptions } from './options';
import { Schema as JestBuilderSchema } from './schema';
import { findTestFiles } from './test-files';

/** Main execution function for the Jest builder. */
export default createBuilder(
  async (schema: JestBuilderSchema, context: BuilderContext): Promise<BuilderOutput> => {
    context.logger.warn(
      'NOTE: The Jest builder is currently EXPERIMENTAL and not ready for production use.',
    );

    const options = normalizeOptions(schema);
    const testFiles = await findTestFiles(options, context.workspaceRoot);
    const testOut = 'dist/test-out'; // TODO(dgp1130): Hide in temp directory.

    // Build all the test files.
    return await build(context, {
      entryPoints: testFiles,
      tsConfig: options.tsConfig,
      polyfills: options.polyfills,
      outputPath: testOut,
      aot: false,
      index: null,
      outputHashing: OutputHashing.None,
      outExtension: 'mjs', // Force native ESM.
      commonChunk: false,
      optimization: false,
      buildOptimizer: false,
      sourceMap: {
        scripts: true,
        styles: false,
        vendor: false,
      },
    });
  },
);

async function build(
  context: BuilderContext,
  options: BrowserEsbuildOptions,
): Promise<BuilderOutput> {
  try {
    for await (const _ of buildEsbuildBrowserInternal(options, context)) {
      // Nothing to do for each event, just wait for the whole build.
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}
