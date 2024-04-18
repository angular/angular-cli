/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, targetFromTargetString } from '@angular-devkit/architect';
import path from 'node:path';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
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
  const workspaceRoot = context.workspaceRoot;
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = path.join(workspaceRoot, (projectMetadata.root as string | undefined) ?? '');

  const cacheOptions = normalizeCacheOptions(projectMetadata, workspaceRoot);

  // Target specifier defaults to the current project's build target using a development configuration
  const buildTargetSpecifier = options.buildTarget ?? options.browserTarget ?? `::development`;
  const buildTarget = targetFromTargetString(buildTargetSpecifier, projectName, 'build');

  // Initial options to keep
  const {
    host,
    port,
    poll,
    open,
    verbose,
    watch,
    allowedHosts,
    disableHostCheck,
    liveReload,
    hmr,
    headers,
    proxyConfig,
    servePath,
    publicHost,
    ssl,
    sslCert,
    sslKey,
    forceEsbuild,
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
    allowedHosts,
    disableHostCheck,
    proxyConfig,
    servePath,
    publicHost,
    ssl,
    sslCert,
    sslKey,
    forceEsbuild,
    // Prebundling defaults to true but requires caching to function
    prebundle: cacheOptions.enabled && (prebundle ?? true),
  };
}
