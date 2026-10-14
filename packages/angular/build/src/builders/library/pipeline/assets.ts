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
 * Result of resolving and collecting library assets for a build iteration.
 */
export interface CollectedAssets {
  /** Asset files to emit to disk, with POSIX source and destination paths. */
  filesToEmit: DiskOutputFile[];

  /** Previously emitted asset files whose source files were deleted and should be removed from output. */
  filesToDelete: DiskOutputFile[];
}

interface AssetMatcher {
  asset: NormalizedLibraryOptions['assets'][number];
  prefix: string;
  isMatch: picomatch.Matcher;
}

const assetMatcherCache = new WeakMap<NormalizedLibraryOptions['assets'], AssetMatcher[]>();

/**
 * Resolves and collects configured library assets to be emitted to or deleted from disk.
 *
 * @param assets The normalized asset patterns with POSIX input and output paths.
 * @param workspaceRoot The workspace root POSIX directory path.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental copying in watch mode.
 * @param emittedAssets Optional map of previously emitted POSIX source file paths to relative POSIX output paths.
 * @returns The collected asset files to emit and delete.
 */
export async function collectAssetsToEmit(
  assets: NormalizedLibraryOptions['assets'],
  workspaceRoot: string,
  modifiedFiles?: ReadonlySet<string>,
  emittedAssets?: ReadonlyMap<string, string>,
): Promise<CollectedAssets> {
  if (assets.length === 0 || modifiedFiles?.size === 0) {
    return { filesToEmit: [], filesToDelete: [] };
  }

  if (modifiedFiles) {
    const matchers = getAssetMatchers(assets);
    const filesToEmit: DiskOutputFile[] = [];
    const filesToDelete: DiskOutputFile[] = [];

    for (const file of modifiedFiles) {
      let isFile: boolean | undefined;

      const previousOutput = emittedAssets?.get(file);
      if (previousOutput !== undefined) {
        isFile = statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;
        if (!isFile) {
          filesToDelete.push(createDiskOutputFile(file, previousOutput));
          continue;
        }
      }

      for (const { asset, prefix, isMatch } of matchers) {
        if (!file.startsWith(prefix)) {
          continue;
        }

        const relative = file.slice(prefix.length);
        if (!isMatch(relative)) {
          continue;
        }

        isFile ??= statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;
        if (isFile) {
          filesToEmit.push(createDiskOutputFile(file, path.posix.join(asset.output, relative)));
        }
      }
    }

    return { filesToEmit, filesToDelete };
  }

  const resolvedAssets = await resolveAssets(assets, workspaceRoot);

  return {
    filesToEmit: resolvedAssets.map(({ source, destination }) =>
      createDiskOutputFile(source, destination),
    ),
    filesToDelete: [],
  };
}

/**
 * Returns cached or newly compiled picomatch matchers and POSIX input prefixes for each asset configuration.
 *
 * @param assets The normalized asset patterns with POSIX input and output paths.
 * @returns An array of asset matcher descriptors.
 */
function getAssetMatchers(assets: NormalizedLibraryOptions['assets']): AssetMatcher[] {
  let matchers = assetMatcherCache.get(assets);
  if (!matchers) {
    matchers = assets.map((asset) => {
      const isMatch = picomatch(asset.glob, {
        dot: true,
        ignore: [...DEFAULT_ASSET_IGNORE, ...(asset.ignore ?? [])],
      });
      const prefix = asset.input.endsWith('/') ? asset.input : `${asset.input}/`;

      return { asset, prefix, isMatch };
    });
    assetMatcherCache.set(assets, matchers);
  }

  return matchers;
}
