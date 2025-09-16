/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import { createRequire } from 'node:module';
import { BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { getProjectRootPaths } from '../../utils/project-metadata';
import { findTests, getTestEntrypoints } from './find-tests';
import type { NormalizedKarmaBuilderOptions } from './options';

const localResolve = createRequire(__filename).resolve;

export async function getProjectSourceRoot(context: BuilderContext): Promise<string> {
  // We have already validated that the project name is set before calling this function.
  const projectName = context.target?.project;
  if (!projectName) {
    return context.workspaceRoot;
  }

  const projectMetadata = await context.getProjectMetadata(projectName);
  const { projectSourceRoot } = getProjectRootPaths(context.workspaceRoot, projectMetadata);

  return projectSourceRoot;
}

export function normalizePolyfills(
  polyfills: string[] = [],
): [polyfills: string[], jasmineCleanup: string[]] {
  const jasmineGlobalEntryPoint = localResolve('./polyfills/jasmine_global.js');
  const jasmineGlobalCleanupEntrypoint = localResolve('./polyfills/jasmine_global_cleanup.js');
  const sourcemapEntrypoint = localResolve('./polyfills/init_sourcemaps.js');

  const zoneTestingEntryPoint = 'zone.js/testing';
  const polyfillsExludingZoneTesting = polyfills.filter((p) => p !== zoneTestingEntryPoint);

  return [
    polyfillsExludingZoneTesting.concat([jasmineGlobalEntryPoint, sourcemapEntrypoint]),
    polyfillsExludingZoneTesting.length === polyfills.length
      ? [jasmineGlobalCleanupEntrypoint]
      : [jasmineGlobalCleanupEntrypoint, zoneTestingEntryPoint],
  ];
}

export async function collectEntrypoints(
  options: NormalizedKarmaBuilderOptions,
  context: BuilderContext,
  projectSourceRoot: string,
): Promise<Map<string, string>> {
  // Glob for files to test.
  const testFiles = await findTests(
    options.include,
    options.exclude,
    context.workspaceRoot,
    projectSourceRoot,
  );

  return getTestEntrypoints(testFiles, { projectSourceRoot, workspaceRoot: context.workspaceRoot });
}

export function hasChunkOrWorkerFiles(files: Record<string, unknown>): boolean {
  return Object.keys(files).some((filename) => {
    return /(?:^|\/)(?:worker|chunk)[^/]+\.js$/.test(filename);
  });
}

/** Returns the first item yielded by the given generator and cancels the execution. */
export async function first<T>(
  generator: AsyncIterable<T>,
  { cancel }: { cancel: boolean },
): Promise<[T, AsyncIterator<T> | null]> {
  if (!cancel) {
    const iterator: AsyncIterator<T> = generator[Symbol.asyncIterator]();
    const firstValue = await iterator.next();
    if (firstValue.done) {
      throw new Error('Expected generator to emit at least once.');
    }

    return [firstValue.value, iterator];
  }

  for await (const value of generator) {
    return [value, null];
  }

  throw new Error('Expected generator to emit at least once.');
}
