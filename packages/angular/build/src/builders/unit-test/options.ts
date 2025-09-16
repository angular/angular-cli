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
import type { Schema as UnitTestBuilderOptions } from './schema';

export type NormalizedUnitTestBuilderOptions = Awaited<ReturnType<typeof normalizeOptions>>;

function normalizeReporterOption(
  reporters: unknown[] | undefined,
): [string, Record<string, unknown>][] | undefined {
  return reporters?.map((entry) =>
    typeof entry === 'string'
      ? ([entry, {}] as [string, Record<string, unknown>])
      : (entry as [string, Record<string, unknown>]),
  );
}

export async function normalizeOptions(
  context: BuilderContext,
  projectName: string,
  options: UnitTestBuilderOptions,
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

  const { tsConfig, runner, browsers, progress, filter } = options;

  return {
    // Project/workspace information
    workspaceRoot,
    projectRoot,
    projectSourceRoot,
    cacheOptions,
    // Target/configuration specified options
    buildTarget,
    include: options.include ?? ['**/*.spec.ts'],
    exclude: options.exclude,
    filter,
    runnerName: runner,
    codeCoverage: options.codeCoverage
      ? {
          exclude: options.codeCoverageExclude,
          reporters: normalizeReporterOption(options.codeCoverageReporters),
        }
      : undefined,
    tsConfig,
    buildProgress: progress,
    reporters: normalizeReporterOption(options.reporters),
    outputFile: options.outputFile,
    browsers,
    watch: options.watch ?? isTTY(),
    debug: options.debug ?? false,
    providersFile: options.providersFile && path.join(workspaceRoot, options.providersFile),
    setupFiles: options.setupFiles
      ? options.setupFiles.map((setupFile) => path.join(workspaceRoot, setupFile))
      : [],
    dumpVirtualFiles: options.dumpVirtualFiles,
    listTests: options.listTests,
  };
}

export function injectTestingPolyfills(polyfills: string[] = []): string[] {
  return polyfills.includes('zone.js') ? [...polyfills, 'zone.js/testing'] : polyfills;
}
