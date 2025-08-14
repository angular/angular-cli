/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
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
  const { runnerName, projectSourceRoot } = normalizedOptions;

  // Dynamically load the requested runner
  let runner: TestRunner;
  try {
    const { default: runnerModule } = await import(`./runners/${runnerName}/index`);
    runner = runnerModule;
  } catch (e) {
    assertIsError(e);
    if (e.code !== 'ERR_MODULE_NOT_FOUND') {
      throw e;
    }
    context.logger.error(`Unknown test runner "${runnerName}".`);

    return;
  }

  // Create the stateful executor once
  await using executor = await runner.createExecutor(context, normalizedOptions);

  if (runner.isStandalone) {
    yield* executor.execute({
      kind: ResultKind.Full,
      files: {},
    });

    return;
  }

  // Get base build options from the buildTarget
  const buildTargetOptions = (await context.validateOptions(
    await context.getTargetOptions(normalizedOptions.buildTarget),
    await context.getBuilderNameForTarget(normalizedOptions.buildTarget),
  )) as unknown as ApplicationBuilderInternalOptions;

  // Get runner-specific build options from the hook
  const { buildOptions: runnerBuildOptions, virtualFiles } = await runner.getBuildOptions(
    normalizedOptions,
    buildTargetOptions,
  );

  if (virtualFiles) {
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
  }

  const { watch, tsConfig } = normalizedOptions;

  // Prepare and run the application build
  const applicationBuildOptions = {
    // Base options
    ...buildTargetOptions,
    watch,
    tsConfig,
    // Runner specific
    ...runnerBuildOptions,
  } satisfies ApplicationBuilderInternalOptions;

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
