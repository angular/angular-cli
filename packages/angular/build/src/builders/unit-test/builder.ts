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
import { createVirtualModulePlugin } from '../../tools/esbuild/virtual-module-plugin';
import { assertIsError } from '../../utils/error';
import { buildApplicationInternal } from '../application';
import type {
  ApplicationBuilderExtensions,
  ApplicationBuilderInternalOptions,
} from '../application/options';
import { ResultKind } from '../application/results';
import { normalizeOptions } from './options';
import type { TestRunner } from './runners/api';
import type { Schema as UnitTestBuilderOptions } from './schema';

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
  extensions: ApplicationBuilderExtensions | undefined,
): AsyncIterable<BuilderOutput> {
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

    // Pass the build artifacts to the executor
    yield* executor.execute(buildResult);
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

  context.logger.warn(
    `NOTE: The "unit-test" builder is currently EXPERIMENTAL and not ready for production use.`,
  );

  const normalizedOptions = await normalizeOptions(context, projectName, options);
  const runner = await loadTestRunner(normalizedOptions.runnerName);

  await using executor = await runner.createExecutor(context, normalizedOptions);

  if (runner.isStandalone) {
    yield* executor.execute({
      kind: ResultKind.Full,
      files: {},
    });

    return;
  }

  // Get base build options from the buildTarget
  let buildTargetOptions: ApplicationBuilderInternalOptions;
  try {
    buildTargetOptions = (await context.validateOptions(
      await context.getTargetOptions(normalizedOptions.buildTarget),
      await context.getBuilderNameForTarget(normalizedOptions.buildTarget),
    )) as unknown as ApplicationBuilderInternalOptions;
  } catch (e) {
    assertIsError(e);
    context.logger.error(
      `Could not load build target options for "${targetStringFromTarget(normalizedOptions.buildTarget)}".\n` +
        `Please check your 'angular.json' configuration.\n` +
        `Error: ${e.message}`,
    );

    return;
  }

  // Get runner-specific build options from the hook
  const { buildOptions: runnerBuildOptions, virtualFiles } = await runner.getBuildOptions(
    normalizedOptions,
    buildTargetOptions,
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
    tsConfig: normalizedOptions.tsConfig,
  } satisfies ApplicationBuilderInternalOptions;

  yield* runBuildAndTest(executor, applicationBuildOptions, context, finalExtensions);
}
