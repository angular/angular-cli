/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { CliOptions } from 'vitest/node';
import type { NormalizedUnitTestBuilderOptions } from '../../options';

/**
 * The subset of the normalized builder options that are used to create the Vitest CLI options.
 */
export interface VitestCliOptionsSource extends Pick<
  NormalizedUnitTestBuilderOptions,
  'workspaceRoot' | 'watch' | 'outputFile' | 'filter' | 'ui' | 'debug'
> {
  cacheOptions: Pick<NormalizedUnitTestBuilderOptions['cacheOptions'], 'enabled'>;
}

/**
 * Creates the Vitest CLI level options from the normalized builder options.
 * These are the options that Vitest would otherwise receive from its own command line.
 *
 * @param options The normalized builder options to convert.
 * @param project The name of the Vitest project to execute.
 * @param configPath The path to an external Vitest configuration file, if any.
 * @returns The Vitest CLI options.
 */
export function createVitestCliOptions(
  options: VitestCliOptionsSource,
  project: string,
  configPath: string | false | undefined,
): CliOptions {
  const { workspaceRoot, watch, outputFile, cacheOptions, filter, ui, debug } = options;

  return {
    config: configPath,
    root: workspaceRoot,
    project,
    watch,
    ...(outputFile !== undefined ? { outputFile } : {}),
    ...(cacheOptions.enabled ? {} : { cache: false as const }),
    ...(filter !== undefined ? { testNamePattern: filter } : {}),
    ...(typeof ui === 'boolean' ? { ui } : {}),
    ...(debug ? { inspectBrk: true, isolate: false, fileParallelism: false } : {}),
  };
}
