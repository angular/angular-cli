/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Result, ResultKind, buildApplicationInternal } from '@angular/build/private';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type * as WebTestRunner from '@web/test-runner';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { findTestFiles } from '../../utils/test-files';
import { OutputHashing } from '../browser-esbuild/schema';
import { logBuilderStatusWarnings } from './builder-status-warnings';
import { WtrBuilderOptions, normalizeOptions } from './options';
import { Schema } from './schema';
import { writeTestFiles } from './write-test-files';

export default createBuilder(
  async (schema: Schema, ctx: BuilderContext): Promise<BuilderOutput> => {
    ctx.logger.warn(
      'NOTE: The Web Test Runner builder is currently EXPERIMENTAL and not ready for production use.',
    );
    logBuilderStatusWarnings(schema, ctx);

    // Dynamic import `@web/test-runner` from the user's workspace. As an optional peer dep, it may not be installed
    // and may not be resolvable from `@angular-devkit/build-angular`.
    const require = createRequire(`${ctx.workspaceRoot}/`);
    let wtr: typeof WebTestRunner;
    try {
      wtr = require('@web/test-runner');
    } catch {
      return {
        success: false,
        // TODO(dgp1130): Display a more accurate message for non-NPM users.
        error:
          'Web Test Runner is not installed, most likely you need to run `npm install @web/test-runner --save-dev` in your project.',
      };
    }

    const options = normalizeOptions(schema);

    const testDir = path.join(ctx.workspaceRoot, 'dist/test-out', randomUUID());

    // Parallelize startup work.
    const [testFiles] = await Promise.all([
      // Glob for files to test.
      findTestFiles(options.include, options.exclude, ctx.workspaceRoot),
      // Clean build output path.
      fs.rm(testDir, { recursive: true, force: true }),
    ]);

    // Build the tests and abort on any build failure.
    const buildOutput = await buildTests(testFiles, testDir, options, ctx);
    if (buildOutput.kind === ResultKind.Failure) {
      return { success: false };
    } else if (buildOutput.kind !== ResultKind.Full) {
      return {
        success: false,
        error: 'A full build result is required from the application builder.',
      };
    }

    // Write test files
    await writeTestFiles(buildOutput.files, testDir);

    // Run the built tests.
    return await runTests(wtr, testDir, options);
  },
);

/** Build all the given test files and write the result to the given output path. */
async function buildTests(
  testFiles: ReadonlySet<string>,
  outputPath: string,
  options: WtrBuilderOptions,
  ctx: BuilderContext,
): Promise<Result> {
  const entryPoints = new Set([
    ...testFiles,
    'jasmine-core/lib/jasmine-core/jasmine.js',
    '@angular-devkit/build-angular/src/builders/web-test-runner/jasmine_runner.js',
  ]);

  // Extract `zone.js/testing` to a separate entry point because it needs to be loaded after Jasmine.
  const [polyfills, hasZoneTesting] = extractZoneTesting(options.polyfills);
  if (hasZoneTesting) {
    entryPoints.add('zone.js/testing');
  }

  // Build tests with `application` builder, using test files as entry points.
  // Also bundle in Jasmine and the Jasmine runner script, which need to share chunked dependencies.
  const buildOutput = await first(
    buildApplicationInternal(
      {
        entryPoints,
        tsConfig: options.tsConfig,
        outputPath,
        aot: options.aot,
        index: false,
        outputHashing: OutputHashing.None,
        optimization: false,
        externalDependencies: [
          // Resolved by `@web/test-runner` at runtime with dynamically generated code.
          '@web/test-runner-core',
        ],
        sourceMap: {
          scripts: true,
          styles: true,
          vendor: true,
        },
        polyfills,
      },
      ctx,
    ),
  );

  return buildOutput;
}

function extractZoneTesting(
  polyfills: readonly string[],
): [polyfills: string[], hasZoneTesting: boolean] {
  const polyfillsWithoutZoneTesting = polyfills.filter(
    (polyfill) => polyfill !== 'zone.js/testing',
  );
  const hasZoneTesting = polyfills.length !== polyfillsWithoutZoneTesting.length;

  return [polyfillsWithoutZoneTesting, hasZoneTesting];
}

/** Run Web Test Runner on the given directory of bundled JavaScript tests. */
async function runTests(
  wtr: typeof WebTestRunner,
  testDir: string,
  options: WtrBuilderOptions,
): Promise<BuilderOutput> {
  const testPagePath = path.resolve(__dirname, 'test_page.html');
  const testPage = await fs.readFile(testPagePath, 'utf8');

  const runner = await wtr.startTestRunner({
    config: {
      rootDir: testDir,
      files: [
        `${testDir}/**/*.js`,
        `!${testDir}/polyfills.js`,
        `!${testDir}/chunk-*.js`,
        `!${testDir}/jasmine.js`,
        `!${testDir}/jasmine_runner.js`,
        `!${testDir}/testing.js`, // `zone.js/testing`
      ],
      testFramework: {
        config: {
          defaultTimeoutInterval: 5_000,
        },
      },
      nodeResolve: true,
      port: 9876,
      watch: options.watch ?? false,

      testRunnerHtml: (_testFramework, _config) => testPage,
    },
    readCliArgs: false,
    readFileConfig: false,
    autoExitProcess: false,
  });
  if (!runner) {
    throw new Error('Failed to start Web Test Runner.');
  }

  // Wait for the tests to complete and stop the runner.
  const passed = (await once(runner, 'finished')) as boolean;
  await runner.stop();

  // No need to return error messages because Web Test Runner already printed them to the console.
  return { success: passed };
}

/** Returns the first item yielded by the given generator and cancels the execution. */
async function first<T>(generator: AsyncIterable<T>): Promise<T> {
  for await (const value of generator) {
    return value;
  }

  throw new Error('Expected generator to emit at least once.');
}

/** Listens for a single emission of an event and returns the value emitted. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function once<Map extends Record<string, any>, EventKey extends string & keyof Map>(
  emitter: WebTestRunner.EventEmitter<Map>,
  event: EventKey,
): Promise<Map[EventKey]> {
  return new Promise((resolve) => {
    const onEmit = (arg: Map[EventKey]): void => {
      emitter.off(event, onEmit);
      resolve(arg);
    };
    emitter.on(event, onEmit);
  });
}
