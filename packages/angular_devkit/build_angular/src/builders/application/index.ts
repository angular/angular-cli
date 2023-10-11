/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { assertCompatibleAngularVersion } from '../../utils/version';
import { runEsBuildBuildAction } from './build-action';
import { executeBuild } from './execute-build';
import { ApplicationBuilderInternalOptions, normalizeOptions } from './options';
import { Schema as ApplicationBuilderOptions } from './schema';

export { ApplicationBuilderOptions };

export async function* buildApplicationInternal(
  options: ApplicationBuilderInternalOptions,
  // TODO: Integrate abort signal support into builder system
  context: BuilderContext & { signal?: AbortSignal },
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

  const normalizedOptions = await normalizeOptions(context, projectName, options, plugins);

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
      // For app-shell and SSG server files are not required by users.
      // Omit these when SSR is not enabled.
      writeToFileSystemFilter:
        normalizedOptions.ssrOptions && normalizedOptions.serverEntryPoint
          ? undefined
          : (file) => file.type !== BuildOutputFileType.Server,
      logger: context.logger,
      signal: context.signal,
    },
  );
}

/**
 * Builds an application using the `application` builder with the provided
 * options.
 *
 * Usage of the `plugins` parameter is NOT supported and may cause unexpected
 * build output or build failures.
 *
 * @experimental Direct usage of this function is considered experimental.
 *
 * @param options The options defined by the builder's schema to use.
 * @param context An Architect builder context instance.
 * @param plugins An array of plugins to apply to the main code bundling.
 * @returns The build output results of the build.
 */
export function buildApplication(
  options: ApplicationBuilderOptions,
  context: BuilderContext,
  plugins?: Plugin[],
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: BuildOutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
  return buildApplicationInternal(options, context, undefined, plugins);
}

export default createBuilder(buildApplication);
