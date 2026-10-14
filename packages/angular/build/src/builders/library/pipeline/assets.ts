/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { statSync } from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';
import { DEFAULT_ASSET_IGNORE, resolveAssets } from '../../../utils/resolve-assets';
import type { NormalizedLibraryOptions } from '../types';
import { type DiskOutputFile, createDiskOutputFile } from './utils';

/**
 * Resolves and collects configured library assets to be emitted to disk.
 *
 * @param assets The normalized asset patterns with POSIX paths.
 * @param workspaceRoot The normalized POSIX workspace root directory path.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental copying in watch mode.
 * @returns An array of disk file emission descriptors.
 */
export async function collectAssetsToEmit(
  assets: NormalizedLibraryOptions['assets'],
  workspaceRoot: string,
  modifiedFiles?: ReadonlySet<string>,
): Promise<DiskOutputFile[]> {
  if (assets.length === 0 || modifiedFiles?.size === 0) {
    return [];
  }

  if (modifiedFiles) {
    const matchers = createAssetMatchers(assets);
    const filesToEmit: DiskOutputFile[] = [];

    for (const file of modifiedFiles) {
      for (const { asset, isMatch } of matchers) {
        const relative = path.posix.relative(asset.input, file);
        if (!relative || relative.startsWith('..') || path.posix.isAbsolute(relative)) {
          continue;
        }

        if (!isMatch(relative)) {
          continue;
        }

        if (statSync(file, { throwIfNoEntry: false })?.isFile()) {
          filesToEmit.push(createDiskOutputFile(file, path.posix.join(asset.output, relative)));
        }
      }
    }

    return filesToEmit;
  }

  const resolvedAssets = await resolveAssets(assets, workspaceRoot);

  return resolvedAssets.map(({ source, destination }) => createDiskOutputFile(source, destination));
}

function createAssetMatchers(assets: NormalizedLibraryOptions['assets']) {
  return assets.map((asset) => {
    const isMatch = picomatch(asset.glob, {
      dot: true,
      ignore: [...DEFAULT_ASSET_IGNORE, ...(asset.ignore ?? [])],
    });

    return { asset, isMatch };
  });
}
