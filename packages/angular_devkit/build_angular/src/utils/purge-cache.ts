/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { PathLike, existsSync, promises as fsPromises } from 'fs';
import { join } from 'path';
import { normalizeCacheOptions } from './normalize-cache';

/** Delete stale cache directories used by previous versions of build-angular. */
export async function purgeStaleBuildCache(context: BuilderContext): Promise<void> {
  const projectName = context.target?.project;
  if (!projectName) {
    return;
  }

  const metadata = await context.getProjectMetadata(projectName);
  const { basePath, path, enabled } = normalizeCacheOptions(metadata, context.workspaceRoot);

  if (!enabled || !existsSync(basePath)) {
    return;
  }

  // The below should be removed and replaced with just `rm` when support for Node.Js 12 is removed.
  const { rm, rmdir } = fsPromises as typeof fsPromises & {
    rm?: (
      path: PathLike,
      options?: {
        force?: boolean;
        maxRetries?: number;
        recursive?: boolean;
        retryDelay?: number;
      },
    ) => Promise<void>;
  };

  const entriesToDelete = (await fsPromises.readdir(basePath, { withFileTypes: true }))
    .filter((d) => join(basePath, d.name) !== path && d.isDirectory())
    .map((d) => {
      const subPath = join(basePath, d.name);
      try {
        return rm
          ? rm(subPath, { force: true, recursive: true, maxRetries: 3 })
          : rmdir(subPath, { recursive: true, maxRetries: 3 });
      } catch {}
    });

  await Promise.all(entriesToDelete);
}
