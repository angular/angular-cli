/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import { BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { createJsonBuildManifest } from '../../tools/esbuild/utils';
import { colors as ansiColors } from '../../utils/color';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { assertCompatibleAngularVersion } from '../../utils/version';
import { BuildActionOutput, runEsBuildBuildAction } from './build-action';
import { executeBuild } from './execute-build';
import {
  ApplicationBuilderExtensions,
  ApplicationBuilderInternalOptions,
  normalizeOptions,
} from './options';
import { Schema as ApplicationBuilderOptions } from './schema';

export { ApplicationBuilderOptions };

export type ApplicationBuilderOutput = BuildActionOutput;

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
    throw new Error(`The 'application' builder requires a target to be specified.`);
  }

  const normalizedOptions = await normalizeOptions(context, projectName, options, extensions);
  const writeToFileSystem = infrastructureSettings?.write ?? true;
  const writeServerBundles =
    writeToFileSystem && !!(normalizedOptions.ssrOptions && normalizedOptions.serverEntryPoint);

  if (writeServerBundles) {
    const { browser, server } = normalizedOptions.outputOptions;
    if (browser === '') {
      throw new Error(
        `'outputPath.browser' cannot be configured to an empty string when SSR is enabled.`,
      );
    }

    if (browser === server) {
      throw new Error(
        `'outputPath.browser' and 'outputPath.server' cannot be configured to the same value.`,
      );
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

      if (jsonLogs) {
        result.addLog(await createJsonBuildManifest(result, normalizedOptions));
      } else {
        if (prerenderOptions) {
          const prerenderedRoutesLength = result.prerenderedRoutes.length;
          let prerenderMsg = `Prerendered ${prerenderedRoutesLength} static route`;
          prerenderMsg += prerenderedRoutesLength !== 1 ? 's.' : '.';

          result.addLog(ansiColors.magenta(prerenderMsg));
        }

        const buildTime = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
        const hasError = result.errors.length > 0;
        if (writeToFileSystem && !hasError) {
          result.addLog(`Output location: ${outputOptions.base}\n`);
        }

        result.addLog(
          `Application bundle generation ${hasError ? 'failed' : 'complete'}. [${buildTime.toFixed(3)} seconds]\n`,
        );
      }

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
      colors: normalizedOptions.colors,
      jsonLogs: normalizedOptions.jsonLogs,
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

export default createBuilder(async function* (options, context) {
  for await (const result of buildApplication(options, context)) {
    // The builder system (architect) currently attempts to treat all results as JSON and
    // attempts to validate the object with a JSON schema validator. This can lead to slow
    // build completion (even after the actual build is fully complete) or crashes if the
    // size and/or quantity of output files is large. Architect only requires a `success`
    // property so that is all that will be passed here if the infrastructure settings have
    // not been explicitly set to avoid writes. Writing is only disabled when used directly
    // by the dev server which bypasses the architect behavior.
    const { success } = result;

    yield {
      success,
    };
  }
});
