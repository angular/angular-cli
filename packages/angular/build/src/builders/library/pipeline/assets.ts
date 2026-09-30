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
import type { NormalizedLibraryOptions } from '../options';
import { type DiskOutputFile, createDiskOutputFile } from './utils';

/**
 * Resolves and collects configured library assets to be emitted to disk,
 * and registers their source paths with the watch set.
 *
 * @param assets The normalized asset patterns.
 * @param workspaceRoot The workspace root directory path.
 * @param allWatchedFiles Set collecting all watched file paths for watch mode.
 * @param modifiedFiles Optional set of modified file paths for incremental copying in watch mode.
 * @returns An array of disk file emission descriptors.
 */
export async function collectAssetsToEmit(
  assets: NormalizedLibraryOptions['assets'],
  workspaceRoot: string,
  allWatchedFiles: Set<string>,
  modifiedFiles?: ReadonlySet<string>,
): Promise<DiskOutputFile[]> {
  if (assets.length === 0) {
    return [];
  }

  if (modifiedFiles) {
    if (modifiedFiles.size === 0) {
      return [];
    }

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
          allWatchedFiles.add(posixFile);
        }
      }
    }

    return filesToEmit;
  }

  const resolvedAssets = await resolveAssets(assets, workspaceRoot);
  const filesToEmit: DiskOutputFile[] = [];

  for (const { source, destination } of resolvedAssets) {
    filesToEmit.push(createDiskOutputFile(source, destination));
    allWatchedFiles.add(toPosixPath(source));
  }

  return filesToEmit;
}

/**
 * Checks whether any configured library assets were modified.
 *
 * @param assets The normalized asset patterns.
 * @param workspaceRoot The workspace root directory path.
 * @param changedFiles Set of changed file paths.
 * @returns True if any asset file was modified.
 */
export function checkAssetChanges(
  assets: NormalizedLibraryOptions['assets'],
  workspaceRoot: string,
  changedFiles: ReadonlySet<string>,
): boolean {
  if (assets.length === 0 || changedFiles.size === 0) {
    return false;
  }

  const matchers = createAssetMatchers(assets, workspaceRoot);

  for (const file of changedFiles) {
    const resolvedFile = path.isAbsolute(file) ? file : path.resolve(workspaceRoot, file);
    const posixFile = toPosixPath(resolvedFile);

    for (const { posixInputPrefix, isMatch } of matchers) {
      if (posixFile.startsWith(posixInputPrefix)) {
        const relative = posixFile.slice(posixInputPrefix.length);
        if (isMatch(relative)) {
          return true;
        }
      }
    }
  }

  return false;
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
