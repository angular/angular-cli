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
import { logMessages } from '../../tools/esbuild/utils';
import { colors as ansiColors } from '../../utils/color';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { assertCompatibleAngularVersion } from '../../utils/version';
import { runEsBuildBuildAction } from './build-action';
import { executeBuild } from './execute-build';
import {
  ApplicationBuilderExtensions,
  ApplicationBuilderInternalOptions,
  normalizeOptions,
} from './options';
import { Schema as ApplicationBuilderOptions } from './schema';

export { ApplicationBuilderOptions };

export async function* buildApplicationInternal(
  options: ApplicationBuilderInternalOptions,
  // TODO: Integrate abort signal support into builder system
  context: BuilderContext & { signal?: AbortSignal },
  infrastructureSettings?: {
    write?: boolean;
  },
  extensions?: ApplicationBuilderExtensions,
): AsyncIterable<ApplicationBuilderOutput> {
  const { workspaceRoot, logger, target } = context;

  // Check Angular version.
  assertCompatibleAngularVersion(workspaceRoot);

  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

  // Determine project name from builder context target
  const projectName = target?.project;
  if (!projectName) {
    yield { success: false, error: `The 'application' builder requires a target to be specified.` };

    return;
  }

  const normalizedOptions = await normalizeOptions(context, projectName, options, extensions);
  const writeToFileSystem = infrastructureSettings?.write ?? true;
  const writeServerBundles =
    writeToFileSystem && !!(normalizedOptions.ssrOptions && normalizedOptions.serverEntryPoint);

  if (writeServerBundles) {
    const { browser, server } = normalizedOptions.outputOptions;
    if (browser === '') {
      yield {
        success: false,
        error: `'outputPath.browser' cannot be configured to an empty string when SSR is enabled.`,
      };

      return;
    }

    if (browser === server) {
      yield {
        success: false,
        error: `'outputPath.browser' and 'outputPath.server' cannot be configured to the same value.`,
      };

      return;
    }
  }

  // Setup an abort controller with a builder teardown if no signal is present
  let signal = context.signal;
  if (!signal) {
    const controller = new AbortController();
    signal = controller.signal;
    context.addTeardown(() => controller.abort('builder-teardown'));
  }

  yield* runEsBuildBuildAction(
    async (rebuildState) => {
      const { prerenderOptions, outputOptions, jsonLogs } = normalizedOptions;

      const startTime = process.hrtime.bigint();
      const result = await executeBuild(normalizedOptions, context, rebuildState);

      if (!jsonLogs) {
        if (prerenderOptions) {
          const prerenderedRoutesLength = result.prerenderedRoutes.length;
          let prerenderMsg = `Prerendered ${prerenderedRoutesLength} static route`;
          prerenderMsg += prerenderedRoutesLength !== 1 ? 's.' : '.';

          logger.info(ansiColors.magenta(prerenderMsg));
        }

        const buildTime = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
        const hasError = result.errors.length > 0;
        if (writeToFileSystem && !hasError) {
          logger.info(`Output location: ${outputOptions.base}\n`);
        }

        logger.info(
          `Application bundle generation ${hasError ? 'failed' : 'complete'}. [${buildTime.toFixed(3)} seconds]`,
        );
      }

      // Log all diagnostic (error/warning) messages
      await logMessages(logger, result, normalizedOptions);

      return result;
    },
    {
      watch: normalizedOptions.watch,
      preserveSymlinks: normalizedOptions.preserveSymlinks,
      poll: normalizedOptions.poll,
      deleteOutputPath: normalizedOptions.deleteOutputPath,
      cacheOptions: normalizedOptions.cacheOptions,
      outputOptions: normalizedOptions.outputOptions,
      verbose: normalizedOptions.verbose,
      projectRoot: normalizedOptions.projectRoot,
      workspaceRoot: normalizedOptions.workspaceRoot,
      progress: normalizedOptions.progress,
      clearScreen: normalizedOptions.clearScreen,
      writeToFileSystem,
      // For app-shell and SSG server files are not required by users.
      // Omit these when SSR is not enabled.
      writeToFileSystemFilter: writeServerBundles
        ? undefined
        : (file) => file.type !== BuildOutputFileType.Server,
      logger,
      signal,
    },
  );
}

export interface ApplicationBuilderOutput extends BuilderOutput {
  outputFiles?: BuildOutputFile[];
  assetFiles?: { source: string; destination: string }[];
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
): AsyncIterable<ApplicationBuilderOutput>;

/**
 * Builds an application using the `application` builder with the provided
 * options.
 *
 * Usage of the `extensions` parameter is NOT supported and may cause unexpected
 * build output or build failures.
 *
 * @experimental Direct usage of this function is considered experimental.
 *
 * @param options The options defined by the builder's schema to use.
 * @param context An Architect builder context instance.
 * @param extensions An object contain extension points for the build.
 * @returns The build output results of the build.
 */
export function buildApplication(
  options: ApplicationBuilderOptions,
  context: BuilderContext,
  extensions?: ApplicationBuilderExtensions,
): AsyncIterable<ApplicationBuilderOutput>;

export function buildApplication(
  options: ApplicationBuilderOptions,
  context: BuilderContext,
  pluginsOrExtensions?: Plugin[] | ApplicationBuilderExtensions,
): AsyncIterable<ApplicationBuilderOutput> {
  let extensions: ApplicationBuilderExtensions | undefined;
  if (pluginsOrExtensions && Array.isArray(pluginsOrExtensions)) {
    extensions = {
      codePlugins: pluginsOrExtensions,
    };
  } else {
    extensions = pluginsOrExtensions;
  }

  return buildApplicationInternal(options, context, undefined, extensions);
}

export default createBuilder(buildApplication);
