/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { execFile as execFileCb } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { colors } from '../../utils/color';
import { buildEsbuildBrowserInternal } from '../browser-esbuild';
import { BrowserEsbuildOptions } from '../browser-esbuild/options';
import { OutputHashing } from '../browser-esbuild/schema';
import { normalizeOptions } from './options';
import { Schema as JestBuilderSchema } from './schema';
import { findTestFiles } from './test-files';

const execFile = promisify(execFileCb);

/** Main execution function for the Jest builder. */
export default createBuilder(
  async (schema: JestBuilderSchema, context: BuilderContext): Promise<BuilderOutput> => {
    context.logger.warn(
      'NOTE: The Jest builder is currently EXPERIMENTAL and not ready for production use.',
    );

    const options = normalizeOptions(schema);
    const testOut = 'dist/test-out'; // TODO(dgp1130): Hide in temp directory.

    // Verify Jest installation and get the path to it's binary.
    // We need to `node_modules/.bin/jest`, but there is no means to resolve that directly. Fortunately Jest's `package.json` exports the
    // same file at `bin/jest`, so we can just resolve that instead.
    const jest = resolveModule('jest/bin/jest');
    if (!jest) {
      return {
        success: false,
        // TODO(dgp1130): Display a more accurate message for non-NPM users.
        error:
          'Jest is not installed, most likely you need to run `npm install jest --save-dev` in your project.',
      };
    }

    // Verify that JSDom is installed in the project.
    const environment = resolveModule('jest-environment-jsdom');
    if (!environment) {
      return {
        success: false,
        // TODO(dgp1130): Display a more accurate message for non-NPM users.
        error:
          '`jest-environment-jsdom` is not installed. Install it with `npm install jest-environment-jsdom --save-dev`.',
      };
    }

    // Build all the test files.
    const testFiles = await findTestFiles(options, context.workspaceRoot);
    const buildResult = await build(context, {
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
    if (!buildResult.success) {
      return buildResult;
    }

    // Execute Jest on the built output directory.
    const jestProc = execFile('node', [
      '--experimental-vm-modules',
      jest,

      `--rootDir=${testOut}`,
      '--testEnvironment=jsdom',

      // TODO(dgp1130): Enable cache once we have a mechanism for properly clearing / disabling it.
      '--no-cache',

      // Run basically all files in the output directory, any excluded files were already dropped by the build.
      `--testMatch=${path.join('<rootDir>', '**', '*.mjs')}`,

      // Load polyfills before each test, and don't run them directly as a test.
      `--setupFilesAfterEnv=${path.join('<rootDir>', 'polyfills.mjs')}`,
      `--testPathIgnorePatterns=${path.join('<rootDir>', 'polyfills\\.mjs')}`,

      // Skip shared chunks, as they are not entry points to tests.
      `--testPathIgnorePatterns=${path.join('<rootDir>', 'chunk-.*\\.mjs')}`,

      // Optionally enable color.
      ...(colors.enabled ? ['--colors'] : []),
    ]);

    // Stream test output to the terminal.
    jestProc.child.stdout?.on('data', (chunk) => {
      context.logger.info(chunk);
    });
    jestProc.child.stderr?.on('data', (chunk) => {
      // Write to stderr directly instead of `context.logger.error(chunk)` because the logger will overwrite Jest's coloring information.
      process.stderr.write(chunk);
    });

    try {
      await jestProc;
    } catch (error) {
      // No need to propagate error message, already piped to terminal output.
      // TODO(dgp1130): Handle process spawning failures.
      return { success: false };
    }

    return { success: true };
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

/** Safely resolves the given Node module string. */
function resolveModule(module: string): string | undefined {
  try {
    return require.resolve(module);
  } catch {
    return undefined;
  }
}
