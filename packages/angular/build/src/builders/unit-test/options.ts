/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type BuilderContext, targetFromTargetString } from '@angular-devkit/architect';
import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { getProjectRootPaths } from '../../utils/project-metadata';
import { isTTY } from '../../utils/tty';
import { Runner, type Schema as UnitTestBuilderOptions } from './schema';

export type NormalizedUnitTestBuilderOptions = Awaited<ReturnType<typeof normalizeOptions>>;

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path, constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

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

  const { runner, browsers, progress, filter, browserViewport, ui, runnerConfig } = options;

  if (ui && runner !== Runner.Vitest) {
    throw new Error('The "ui" option is only available for the "vitest" runner.');
  }

  const [width, height] = browserViewport?.split('x').map(Number) ?? [];

  let tsConfig = options.tsConfig;
  if (tsConfig) {
    const fullTsConfigPath = path.join(workspaceRoot, tsConfig);
    if (!(await exists(fullTsConfigPath))) {
      throw new Error(`The specified tsConfig file '${tsConfig}' does not exist.`);
    }
  } else {
    const tsconfigSpecPath = path.join(projectRoot, 'tsconfig.spec.json');
    if (await exists(tsconfigSpecPath)) {
      // The application builder expects a path relative to the workspace root.
      tsConfig = path.relative(workspaceRoot, tsconfigSpecPath);
    }
  }

  let watch = options.watch ?? isTTY();
  if (options.ui && options.watch === false) {
    context.logger.warn(
      `The '--ui' option requires watch mode. The '--no-watch' flag will be ignored.`,
    );
    watch = true;
  }

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
    runnerName: runner ?? Runner.Vitest,
    coverage: {
      enabled: options.coverage,
      exclude: options.coverageExclude,
      include: options.coverageInclude,
      reporters: normalizeReporterOption(options.coverageReporters),
      thresholds: options.coverageThresholds,
      // The schema generation tool doesn't support tuple types for items, but the schema validation
      // does ensure that the array has exactly two numbers.
      watermarks: options.coverageWatermarks as {
        statements?: [number, number];
        branches?: [number, number];
        functions?: [number, number];
        lines?: [number, number];
      },
    },
    tsConfig,
    buildProgress: progress,
    reporters: normalizeReporterOption(options.reporters),
    outputFile: options.outputFile,
    browsers,
    browserViewport: width && height ? { width, height } : undefined,
    watch,
    debug: options.debug ?? false,
    ui: process.env['CI'] ? false : ui,
    providersFile: options.providersFile && path.join(workspaceRoot, options.providersFile),
    setupFiles: options.setupFiles
      ? options.setupFiles.map((setupFile) => path.join(workspaceRoot, setupFile))
      : [],
    dumpVirtualFiles: options.dumpVirtualFiles,
    listTests: options.listTests,
    runnerConfig:
      typeof runnerConfig === 'string'
        ? runnerConfig.length === 0
          ? true
          : path.resolve(workspaceRoot, runnerConfig)
        : runnerConfig,
  };
}

export function injectTestingPolyfills(polyfills: string[] = []): string[] {
  return polyfills.includes('zone.js') ? [...polyfills, 'zone.js/testing'] : polyfills;
}
