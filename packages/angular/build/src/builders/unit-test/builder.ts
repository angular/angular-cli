/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  type BuilderContext,
  type BuilderOutput,
  targetStringFromTarget,
} from '@angular-devkit/architect';
import assert from 'node:assert';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { createVirtualModulePlugin } from '../../tools/esbuild/virtual-module-plugin';
import { assertIsError } from '../../utils/error';
import { writeTestFiles } from '../../utils/test-files';
import { buildApplicationInternal } from '../application';
import type {
  ApplicationBuilderExtensions,
  ApplicationBuilderInternalOptions,
} from '../application/options';
import { ResultKind } from '../application/results';
import { normalizeOptions } from './options';
import type { TestRunner } from './runners/api';
import { MissingDependenciesError } from './runners/dependency-checker';
import type { Schema as UnitTestBuilderOptions } from './schema';
import { findTests } from './test-discovery';

export type { UnitTestBuilderOptions };

async function loadTestRunner(runnerName: string): Promise<TestRunner> {
  // Harden against directory traversal
  if (!/^[a-zA-Z0-9-]+$/.test(runnerName)) {
    throw new Error(
      `Invalid runner name "${runnerName}". Runner names can only contain alphanumeric characters and hyphens.`,
    );
  }

  let runnerModule;
  try {
    runnerModule = await import(`./runners/${runnerName}/index`);
  } catch (e) {
    assertIsError(e);
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(`Unknown test runner "${runnerName}".`);
    }
    throw new Error(
      `Failed to load the '${runnerName}' test runner. The package may be corrupted or improperly installed.\n` +
        `Error: ${e.message}`,
    );
  }

  const runner = runnerModule.default;
  if (
    !runner ||
    typeof runner.getBuildOptions !== 'function' ||
    typeof runner.createExecutor !== 'function'
  ) {
    throw new Error(
      `The loaded test runner '${runnerName}' does not appear to be a valid TestRunner implementation.`,
    );
  }

  return runner;
}

function prepareBuildExtensions(
  virtualFiles: Record<string, string> | undefined,
  projectSourceRoot: string,
  extensions?: ApplicationBuilderExtensions,
): ApplicationBuilderExtensions | undefined {
  if (!virtualFiles) {
    return extensions;
  }

  extensions ??= {};
  extensions.codePlugins ??= [];
  for (const [namespace, contents] of Object.entries(virtualFiles)) {
    extensions.codePlugins.push(
      createVirtualModulePlugin({
        namespace,
        loadContent: () => {
          return {
            contents,
            loader: 'js',
            resolveDir: projectSourceRoot,
          };
        },
      }),
    );
  }

  return extensions;
}

async function* runBuildAndTest(
  executor: import('./runners/api').TestExecutor,
  applicationBuildOptions: ApplicationBuilderInternalOptions,
  context: BuilderContext,
  dumpDirectory: string | undefined,
  extensions: ApplicationBuilderExtensions | undefined,
): AsyncIterable<BuilderOutput> {
  let consecutiveErrorCount = 0;
  for await (const buildResult of buildApplicationInternal(
    applicationBuildOptions,
    context,
    extensions,
  )) {
    if (buildResult.kind === ResultKind.Failure) {
      yield { success: false };
      continue;
    } else if (
      buildResult.kind !== ResultKind.Full &&
      buildResult.kind !== ResultKind.Incremental
    ) {
      assert.fail(
        'A full and/or incremental build result is required from the application builder.',
      );
    }

    assert(buildResult.files, 'Builder did not provide result files.');

    if (dumpDirectory) {
      if (buildResult.kind === ResultKind.Full) {
        // Full build, so clean the directory
        await rm(dumpDirectory, { recursive: true, force: true });
      } else {
        // Incremental build, so delete removed files
        for (const file of buildResult.removed) {
          await rm(path.join(dumpDirectory, file.path), { force: true });
        }
      }
      await writeTestFiles(buildResult.files, dumpDirectory);
      context.logger.info(`Build output files successfully dumped to '${dumpDirectory}'.`);
    }

    // Pass the build artifacts to the executor
    try {
      yield* executor.execute(buildResult);

      // Successful execution resets the failure counter
      consecutiveErrorCount = 0;
    } catch (e) {
      assertIsError(e);
      context.logger.error(`An exception occurred during test execution:\n${e.stack ?? e.message}`);
      yield { success: false };
      consecutiveErrorCount++;
    }

    if (consecutiveErrorCount >= 3) {
      context.logger.error(
        'Test runner process has failed multiple times in a row. Please fix the configuration and restart the process.',
      );

      return;
    }
  }
}

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export async function* execute(
  options: UnitTestBuilderOptions,
  context: BuilderContext,
  extensions?: ApplicationBuilderExtensions,
): AsyncIterable<BuilderOutput> {
  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The builder requires a target to be specified.`);

    return;
  }

  // Initialize the test runner and normalize options
  let runner;
  let normalizedOptions;
  try {
    normalizedOptions = await normalizeOptions(context, projectName, options);
    runner = await loadTestRunner(normalizedOptions.runnerName);
    await runner.validateDependencies?.(normalizedOptions);
  } catch (e) {
    assertIsError(e);
    if (e instanceof MissingDependenciesError) {
      context.logger.error(e.message);
    } else {
      context.logger.error(
        `An exception occurred during initialization of the test runner:\n${e.stack ?? e.message}`,
      );
    }
    yield { success: false };

    return;
  }

  if (normalizedOptions.listTests) {
    const testFiles = await findTests(
      normalizedOptions.include,
      normalizedOptions.exclude ?? [],
      normalizedOptions.workspaceRoot,
      normalizedOptions.projectSourceRoot,
    );

    context.logger.info('Discovered test files:');
    for (const file of testFiles) {
      context.logger.info(`  ${path.relative(normalizedOptions.workspaceRoot, file)}`);
    }

    yield { success: true };

    return;
  }

  if (runner.isStandalone) {
    try {
      await using executor = await runner.createExecutor(context, normalizedOptions, undefined);
      yield* executor.execute({
        kind: ResultKind.Full,
        files: {},
      });
    } catch (e) {
      assertIsError(e);
      context.logger.error(
        `An exception occurred during standalone test execution:\n${e.stack ?? e.message}`,
      );
      yield { success: false };
    }

    return;
  }

  // Get base build options from the buildTarget
  let buildTargetOptions: ApplicationBuilderInternalOptions;
  try {
    const builderName = await context.getBuilderNameForTarget(normalizedOptions.buildTarget);
    if (
      builderName !== '@angular/build:application' &&
      // TODO: Add comprehensive support for ng-packagr.
      builderName !== '@angular/build:ng-packagr'
    ) {
      context.logger.warn(
        `The 'buildTarget' is configured to use '${builderName}', which is not supported. ` +
          `The 'unit-test' builder is designed to work with '@angular/build:application'. ` +
          'Unexpected behavior or build failures may occur.',
      );
    }

    buildTargetOptions = (await context.validateOptions(
      await context.getTargetOptions(normalizedOptions.buildTarget),
      builderName,
    )) as unknown as ApplicationBuilderInternalOptions;
  } catch (e) {
    assertIsError(e);
    context.logger.error(
      `Could not load build target options for "${targetStringFromTarget(
        normalizedOptions.buildTarget,
      )}".\n` +
        `Please check your 'angular.json' configuration.\n` +
        `Error: ${e.message}`,
    );
    yield { success: false };

    return;
  }

  // Get runner-specific build options
  let runnerBuildOptions;
  let virtualFiles;
  let testEntryPointMappings;
  try {
    ({
      buildOptions: runnerBuildOptions,
      virtualFiles,
      testEntryPointMappings,
    } = await runner.getBuildOptions(normalizedOptions, buildTargetOptions));
  } catch (e) {
    assertIsError(e);
    context.logger.error(
      `An exception occurred while getting runner-specific build options:\n${e.stack ?? e.message}`,
    );
    yield { success: false };

    return;
  }

  try {
    await using executor = await runner.createExecutor(
      context,
      normalizedOptions,
      testEntryPointMappings,
    );

    const finalExtensions = prepareBuildExtensions(
      virtualFiles,
      normalizedOptions.projectSourceRoot,
      extensions,
    );

    // Prepare and run the application build
    const applicationBuildOptions = {
      ...buildTargetOptions,
      ...runnerBuildOptions,
      watch: normalizedOptions.watch,
      progress: normalizedOptions.buildProgress ?? buildTargetOptions.progress,
      ...(normalizedOptions.tsConfig ? { tsConfig: normalizedOptions.tsConfig } : {}),
    } satisfies ApplicationBuilderInternalOptions;

    const dumpDirectory = normalizedOptions.dumpVirtualFiles
      ? path.join(normalizedOptions.cacheOptions.path, 'unit-test', 'output-files')
      : undefined;

    yield* runBuildAndTest(
      executor,
      applicationBuildOptions,
      context,
      dumpDirectory,
      finalExtensions,
    );
  } catch (e) {
    assertIsError(e);
    context.logger.error(
      `An exception occurred while creating the test executor:\n${e.stack ?? e.message}`,
    );
    yield { success: false };
  }
}
