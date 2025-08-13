/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { ApplicationBuilderExtensions } from '../application/options';
import { normalizeOptions } from './options';
import { useKarmaRunner } from './runners/karma';
import { runVitest } from './runners/vitest';
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
  const { runnerName } = normalizedOptions;

  switch (runnerName) {
    case 'karma':
      yield* await useKarmaRunner(context, normalizedOptions);
      break;
    case 'vitest':
      yield* runVitest(normalizedOptions, context, extensions);
      break;
    default:
      context.logger.error('Unknown test runner: ' + runnerName);
      break;
  }
}
