/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { OutputFile } from 'esbuild';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { assertCompatibleAngularVersion } from '../../utils/version';
import { runEsBuildBuildAction } from './build-action';
import { executeBuild } from './execute-build';
import { ApplicationBuilderInternalOptions, normalizeOptions } from './options';
import { Schema as ApplicationBuilderOptions } from './schema';

export async function* buildApplicationInternal(
  options: ApplicationBuilderInternalOptions,
  context: BuilderContext,
  infrastructureSettings?: {
    write?: boolean;
  },
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: OutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot);

  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The 'application' builder requires a target to be specified.`);

    return;
  }

  const normalizedOptions = await normalizeOptions(context, projectName, options);
  yield* runEsBuildBuildAction(
    (rebuildState) => executeBuild(normalizedOptions, context, rebuildState),
    {
      watch: normalizedOptions.watch,
      poll: normalizedOptions.poll,
      deleteOutputPath: normalizedOptions.deleteOutputPath,
      cacheOptions: normalizedOptions.cacheOptions,
      outputPath: normalizedOptions.outputPath,
      verbose: normalizedOptions.verbose,
      projectRoot: normalizedOptions.projectRoot,
      workspaceRoot: normalizedOptions.workspaceRoot,
      progress: normalizedOptions.progress,
      writeToFileSystem: infrastructureSettings?.write,
      logger: context.logger,
    },
  );
}

export function buildApplication(
  options: ApplicationBuilderOptions,
  context: BuilderContext,
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: OutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
  return buildApplicationInternal(options, context);
}

export default createBuilder(buildApplication);
