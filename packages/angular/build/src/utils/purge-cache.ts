/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeCacheOptions } from './normalize-cache';

/** Delete stale cache directories used by previous versions of build-angular. */
export async function purgeStaleBuildCache(context: BuilderContext): Promise<void> {
  const projectName = context.target?.project;
  if (!projectName) {
    return;
  }

  const metadata = await context.getProjectMetadata(projectName);
  const { basePath, path, localBasePath, localPath, enabled } = normalizeCacheOptions(
    metadata,
    context.workspaceRoot,
  );

  if (!enabled) {
    return;
  }

  const basePaths = new Set([basePath]);
  if (localBasePath) {
    basePaths.add(localBasePath);
  }

  for (const base of basePaths) {
    let baseEntries;
    try {
      baseEntries = await readdir(base, { withFileTypes: true });
    } catch {
      // No purging possible if base path does not exist or cannot otherwise be accessed
      continue;
    }

    const currentPath = base === localBasePath ? localPath : path;
    if (!currentPath) {
      // Avoid purging if current path is unavailable to prevent deleting the active cache
      continue;
    }

    const entriesToDelete = baseEntries
      .filter((d) => d.isDirectory())
      .map((d) => join(base, d.name))
      .filter((cachePath) => cachePath !== currentPath)
      .map((stalePath) => rm(stalePath, { force: true, recursive: true, maxRetries: 3 }));

    await Promise.allSettled(entriesToDelete);
  }
}
