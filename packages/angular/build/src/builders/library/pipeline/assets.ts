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
import { toPosixPath } from '../../../utils/path';
import { DEFAULT_ASSET_IGNORE, resolveAssets } from '../../../utils/resolve-assets';
import type { NormalizedLibraryOptions } from '../types';
import { type DiskOutputFile, createDiskOutputFile } from './utils';

/**
 * Resolves and collects configured library assets to be emitted to disk.
 *
 * @param assets The normalized asset patterns.
 * @param workspaceRoot The workspace root directory path.
 * @param modifiedFiles Optional set of modified file paths for incremental copying in watch mode.
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
    const matchers = createAssetMatchers(assets, workspaceRoot);
    const filesToEmit: DiskOutputFile[] = [];

    for (const file of modifiedFiles) {
      const resolvedFile = path.isAbsolute(file) ? file : path.resolve(workspaceRoot, file);
      const posixFile = toPosixPath(resolvedFile);

      for (const { asset, posixInputPrefix, isMatch } of matchers) {
        if (!posixFile.startsWith(posixInputPrefix)) {
          continue;
        }

        const relative = posixFile.slice(posixInputPrefix.length);
        if (!isMatch(relative)) {
          continue;
        }

        if (statSync(resolvedFile, { throwIfNoEntry: false })?.isFile()) {
          filesToEmit.push(createDiskOutputFile(resolvedFile, path.join(asset.output, relative)));
        }
      }
    }

    return filesToEmit;
  }

  const resolvedAssets = await resolveAssets(assets, workspaceRoot);

  return resolvedAssets.map(({ source, destination }) => createDiskOutputFile(source, destination));
}

function createAssetMatchers(assets: NormalizedLibraryOptions['assets'], workspaceRoot: string) {
  return assets.map((asset) => {
    const absInput = path.resolve(workspaceRoot, asset.input);
    const posixInput = toPosixPath(absInput).replace(/\/+$/, '');
    const isMatch = picomatch(asset.glob, {
      dot: true,
      ignore: [...DEFAULT_ASSET_IGNORE, ...(asset.ignore ?? [])],
    });

    return { asset, posixInputPrefix: `${posixInput}/`, isMatch };
  });
}
