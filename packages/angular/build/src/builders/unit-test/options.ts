/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type BuilderContext, targetFromTargetString } from '@angular-devkit/architect';
import path from 'node:path';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { getProjectRootPaths } from '../../utils/project-metadata';
import { isTTY } from '../../utils/tty';
import type { Schema as UnitTestOptions } from './schema';

export type NormalizedUnitTestOptions = Awaited<ReturnType<typeof normalizeOptions>>;

export async function normalizeOptions(
  context: BuilderContext,
  projectName: string,
  options: UnitTestOptions,
) {
  // Setup base paths based on workspace root and project information
  const workspaceRoot = context.workspaceRoot;
  const projectMetadata = await context.getProjectMetadata(projectName);
  const { projectRoot, projectSourceRoot } = getProjectRootPaths(workspaceRoot, projectMetadata);

  // Gather persistent caching option and provide a project specific cache location
  const cacheOptions = normalizeCacheOptions(projectMetadata, workspaceRoot);
  cacheOptions.path = path.join(cacheOptions.path, projectName);

  // Target specifier defaults to the current project's build target using a development configuration
  const buildTargetSpecifier = options.buildTarget ?? `::development`;
  const buildTarget = targetFromTargetString(buildTargetSpecifier, projectName, 'build');

  const { tsConfig, runner, reporters, browsers } = options;

  return {
    // Project/workspace information
    workspaceRoot,
    projectRoot,
    projectSourceRoot,
    cacheOptions,
    // Target/configuration specified options
    buildTarget,
    include: options.include ?? ['**/*.spec.ts'],
    exclude: options.exclude ?? [],
    runnerName: runner,
    codeCoverage: options.codeCoverage
      ? {
          exclude: options.codeCoverageExclude,
          reporters: options.codeCoverageReporters?.map((entry) =>
            typeof entry === 'string'
              ? ([entry, {}] as [string, Record<string, unknown>])
              : (entry as [string, Record<string, unknown>]),
          ),
        }
      : undefined,
    tsConfig,
    reporters,
    browsers,
    watch: options.watch ?? isTTY(),
    debug: options.debug ?? false,
    providersFile: options.providersFile && path.join(workspaceRoot, options.providersFile),
  };
}
