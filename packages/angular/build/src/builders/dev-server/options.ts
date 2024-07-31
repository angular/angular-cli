/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext, targetFromTargetString } from '@angular-devkit/architect';
import path from 'node:path';
import { normalizeOptimization } from '../../utils';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { ApplicationBuilderOptions } from '../application';
import { Schema as DevServerOptions } from './schema';

export type NormalizedDevServerOptions = Awaited<ReturnType<typeof normalizeOptions>>;

/**
 * Normalize the user provided options by creating full paths for all path based options
 * and converting multi-form options into a single form that can be directly used
 * by the build process.
 *
 * @param context The context for current builder execution.
 * @param projectName The name of the project for the current execution.
 * @param options An object containing the options to use for the build.
 * @returns An object containing normalized options required to perform the build.
 */
export async function normalizeOptions(
  context: BuilderContext,
  projectName: string,
  options: DevServerOptions,
) {
  const { workspaceRoot, logger } = context;
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = path.join(workspaceRoot, (projectMetadata.root as string | undefined) ?? '');

  const cacheOptions = normalizeCacheOptions(projectMetadata, workspaceRoot);

  // Target specifier defaults to the current project's build target using the provided dev-server
  // configuration if a configuration is present or the 'development' configuration if not.
  const buildTargetSpecifier =
    options.buildTarget ?? `::${context.target?.configuration || 'development'}`;
  const buildTarget = targetFromTargetString(buildTargetSpecifier, projectName, 'build');

  // Get the application builder options.
  const browserBuilderName = await context.getBuilderNameForTarget(buildTarget);
  const rawBuildOptions = await context.getTargetOptions(buildTarget);
  const buildOptions = (await context.validateOptions(
    rawBuildOptions,
    browserBuilderName,
  )) as unknown as ApplicationBuilderOptions;
  const optimization = normalizeOptimization(buildOptions.optimization);

  if (options.prebundle) {
    if (!cacheOptions.enabled) {
      // Warn if the initial options provided by the user enable prebundling but caching is disabled
      logger.warn(
        'Prebundling has been configured but will not be used because caching has been disabled.',
      );
    } else if (optimization.scripts) {
      // Warn if the initial options provided by the user enable prebundling but script optimization is enabled.
      logger.warn(
        'Prebundling has been configured but will not be used because scripts optimization is enabled.',
      );
    }
  }

  let inspect: false | { host?: string; port?: number } = false;
  const inspectRaw = options.inspect;
  if (inspectRaw === true || inspectRaw === '' || inspectRaw === 'true') {
    inspect = {
      host: undefined,
      port: undefined,
    };
  } else if (typeof inspectRaw === 'string' && inspectRaw !== 'false') {
    const port = +inspectRaw;
    if (isFinite(port)) {
      inspect = {
        host: undefined,
        port,
      };
    } else {
      const [host, port] = inspectRaw.split(':');
      inspect = {
        host,
        port: isNaN(+port) ? undefined : +port,
      };
    }
  }

  // Initial options to keep
  const {
    host,
    port,
    poll,
    open,
    verbose,
    watch,
    liveReload,
    hmr,
    headers,
    proxyConfig,
    servePath,
    ssl,
    sslCert,
    sslKey,
    prebundle,
  } = options;

  // Return all the normalized options
  return {
    buildTarget,
    host: host ?? 'localhost',
    port: port ?? 4200,
    poll,
    open,
    verbose,
    watch,
    liveReload,
    hmr,
    headers,
    workspaceRoot,
    projectRoot,
    cacheOptions,
    proxyConfig,
    servePath,
    ssl,
    sslCert,
    sslKey,
    // Prebundling defaults to true but requires caching to function
    prebundle: cacheOptions.enabled && !optimization.scripts && prebundle,
    inspect,
  };
}
