/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Builder, BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { createJsonBuildManifest, emitFilesToDisk } from '../../tools/esbuild/utils';
import { colors as ansiColors } from '../../utils/color';
import { deleteOutputDir } from '../../utils/delete-output-dir';
import { useJSONBuildLogs } from '../../utils/environment-options';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { assertCompatibleAngularVersion } from '../../utils/version';
import { runEsBuildBuildAction } from './build-action';
import { executeBuild } from './execute-build';
import {
  ApplicationBuilderExtensions,
  ApplicationBuilderInternalOptions,
  NormalizedOutputOptions,
  normalizeOptions,
} from './options';
import { Result, ResultKind } from './results';
import { Schema as ApplicationBuilderOptions } from './schema';

export type { ApplicationBuilderOptions };

export async function* buildApplicationInternal(
  options: ApplicationBuilderInternalOptions,
  // TODO: Integrate abort signal support into builder system
  context: BuilderContext & { signal?: AbortSignal },
  extensions?: ApplicationBuilderExtensions,
): AsyncIterable<Result> {
  const { workspaceRoot, logger, target } = context;

  // Check Angular version.
  assertCompatibleAngularVersion(workspaceRoot);

  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

  // Determine project name from builder context target
  const projectName = target?.project;
  if (!projectName) {
    context.logger.error(`The 'application' builder requires a target to be specified.`);
    // Only the vite-based dev server current uses the errors value
    yield { kind: ResultKind.Failure, errors: [] };

    return;
  }

  const normalizedOptions = await normalizeOptions(context, projectName, options, extensions);

  if (!normalizedOptions.outputOptions.ignoreServer) {
    const { browser, server } = normalizedOptions.outputOptions;
    if (browser === '') {
      context.logger.error(
        `'outputPath.browser' cannot be configured to an empty string when SSR is enabled.`,
      );
      yield { kind: ResultKind.Failure, errors: [] };

      return;
    }

    if (browser === server) {
      context.logger.error(
        `'outputPath.browser' and 'outputPath.server' cannot be configured to the same value.`,
      );
      yield { kind: ResultKind.Failure, errors: [] };

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
      const { serverEntryPoint, jsonLogs, partialSSRBuild } = normalizedOptions;

      const startTime = process.hrtime.bigint();
      const result = await executeBuild(normalizedOptions, context, rebuildState);

      if (jsonLogs) {
        result.addLog(await createJsonBuildManifest(result, normalizedOptions));
      } else {
        if (serverEntryPoint && !partialSSRBuild) {
          const prerenderedRoutesLength = Object.keys(result.prerenderedRoutes).length;
          let prerenderMsg = `Prerendered ${prerenderedRoutesLength} static route`;
          prerenderMsg += prerenderedRoutesLength !== 1 ? 's.' : '.';

          result.addLog(ansiColors.magenta(prerenderMsg));
        }

        const buildTime = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
        const hasError = result.errors.length > 0;

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
      cacheOptions: normalizedOptions.cacheOptions,
      outputOptions: normalizedOptions.outputOptions,
      verbose: normalizedOptions.verbose,
      projectRoot: normalizedOptions.projectRoot,
      workspaceRoot: normalizedOptions.workspaceRoot,
      progress: normalizedOptions.progress,
      clearScreen: normalizedOptions.clearScreen,
      colors: normalizedOptions.colors,
      jsonLogs: normalizedOptions.jsonLogs,
      incrementalResults: normalizedOptions.incrementalResults,
      logger,
      signal,
    },
  );
}

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
export async function* buildApplication(
  options: ApplicationBuilderOptions,
  context: BuilderContext,
  extensions?: ApplicationBuilderExtensions,
): AsyncIterable<BuilderOutput> {
  let initial = true;
  const internalOptions = { ...options, incrementalResults: true };
  for await (const result of buildApplicationInternal(internalOptions, context, extensions)) {
    const outputOptions = result.detail?.['outputOptions'] as NormalizedOutputOptions | undefined;

    if (initial) {
      initial = false;

      // Clean the output location if requested.
      // Output options may not be present if the build failed.
      if (outputOptions?.clean) {
        await deleteOutputDir(context.workspaceRoot, outputOptions.base, [
          outputOptions.browser,
          outputOptions.server,
        ]);
      }
    }

    if (result.kind === ResultKind.Failure) {
      yield { success: false };
      continue;
    }

    assert(outputOptions, 'Application output options are required for builder usage.');
    assert(
      result.kind === ResultKind.Full || result.kind === ResultKind.Incremental,
      'Application build did not provide a file result output.',
    );

    // TODO: Restructure output logging to better handle stdout JSON piping
    if (!useJSONBuildLogs) {
      context.logger.info(`Output location: ${outputOptions.base}\n`);
    }

    // Writes the output files to disk and ensures the containing directories are present
    const directoryExists = new Set<string>();
    await emitFilesToDisk(Object.entries(result.files), async ([filePath, file]) => {
      if (
        outputOptions.ignoreServer &&
        (file.type === BuildOutputFileType.ServerApplication ||
          file.type === BuildOutputFileType.ServerRoot)
      ) {
        return;
      }

      const fullFilePath = generateFullPath(filePath, file.type, outputOptions);

      // Ensure output subdirectories exist
      const fileBasePath = path.dirname(fullFilePath);
      if (fileBasePath && !directoryExists.has(fileBasePath)) {
        await fs.mkdir(fileBasePath, { recursive: true });
        directoryExists.add(fileBasePath);
      }

      if (file.origin === 'memory') {
        // Write file contents
        await fs.writeFile(fullFilePath, file.contents);
      } else {
        // Copy file contents
        await fs.copyFile(file.inputPath, fullFilePath, fs.constants.COPYFILE_FICLONE);
      }
    });

    // Delete any removed files if incremental
    if (result.kind === ResultKind.Incremental && result.removed?.length) {
      await Promise.all(
        result.removed.map((file) => {
          const fullFilePath = generateFullPath(file.path, file.type, outputOptions);

          return fs.rm(fullFilePath, { force: true, maxRetries: 3 });
        }),
      );
    }

    yield { success: true };
  }
}

function generateFullPath(
  filePath: string,
  type: BuildOutputFileType,
  outputOptions: NormalizedOutputOptions,
) {
  let typeDirectory: string;
  switch (type) {
    case BuildOutputFileType.Browser:
    case BuildOutputFileType.Media:
      typeDirectory = outputOptions.browser;
      break;
    case BuildOutputFileType.ServerApplication:
    case BuildOutputFileType.ServerRoot:
      typeDirectory = outputOptions.server;
      break;
    case BuildOutputFileType.Root:
      typeDirectory = '';
      break;
    default:
      throw new Error(
        `Unhandled write for file "${filePath}" with type "${BuildOutputFileType[type]}".`,
      );
  }
  // NOTE: 'base' is a fully resolved path at this point
  const fullFilePath = path.join(outputOptions.base, typeDirectory, filePath);

  return fullFilePath;
}

const builder: Builder<ApplicationBuilderOptions & json.JsonObject> =
  createBuilder(buildApplication);

export default builder;
