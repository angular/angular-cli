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
import type { NormalizedAssetsPattern } from '../../../utils';
import { DEFAULT_ASSET_IGNORE, resolveAssets } from '../../../utils/resolve-assets';
import { type DiskOutputFile, createDiskOutputFile } from './utils';

/**
 * Result of resolving and collecting library assets for a build iteration.
 */
export interface CollectedAssets {
  /** Asset files to emit to disk, with POSIX source and destination paths. */
  filesToEmit: DiskOutputFile[];

  /** Previously emitted POSIX asset source file paths that were deleted from disk. */
  filesToDelete: string[];
}

/**
 * Compiled asset matcher for incremental watch-mode matching.
 */
export interface AssetMatcher {
  /** Normalized asset pattern configuration. */
  asset: NormalizedAssetsPattern;

  /** Normalized POSIX input directory path with a trailing slash. */
  prefix: string;

  /** Compiled picomatch matcher function for the asset glob. */
  isMatch: picomatch.Matcher;
}

/**
 * Compiles picomatch matchers and POSIX input prefixes for each asset configuration.
 *
 * @param assets The normalized asset patterns with POSIX input and output paths.
 * @returns An array of compiled asset matcher descriptors.
 */
export function createAssetMatchers(assets: NormalizedAssetsPattern[]): readonly AssetMatcher[] {
  return assets.map((asset) => {
    const isMatch = picomatch(asset.glob, {
      dot: true,
      ignore: [...DEFAULT_ASSET_IGNORE, ...(asset.ignore ?? [])],
    });
    const prefix = asset.input.endsWith('/') ? asset.input : `${asset.input}/`;

    return { asset, prefix, isMatch };
  });
}

/**
 * Resolves and collects configured library assets to be emitted to or deleted from disk.
 *
 * @param assets The normalized asset patterns with POSIX input and output paths.
 * @param workspaceRoot The workspace root POSIX directory path.
 * @param emittedAssets Map of previously emitted POSIX source file paths.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental copying in watch mode.
 * @param assetMatchers Optional pre-compiled asset matchers for incremental matching.
 * @returns The collected asset files to emit and delete.
 */
export async function collectAssetsToEmit(
  assets: NormalizedAssetsPattern[],
  workspaceRoot: string,
  emittedAssets: ReadonlyMap<string, unknown>,
  modifiedFiles?: ReadonlySet<string>,
  assetMatchers?: readonly AssetMatcher[],
): Promise<CollectedAssets> {
  if (assets.length === 0 || modifiedFiles?.size === 0) {
    return { filesToEmit: [], filesToDelete: [] };
  }

  if (modifiedFiles) {
    const matchers = assetMatchers ?? createAssetMatchers(assets);
    const filesToEmit: DiskOutputFile[] = [];
    const filesToDelete: string[] = [];

    for (const file of modifiedFiles) {
      let isFile: boolean | undefined;

      if (emittedAssets.has(file)) {
        isFile = statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;
        if (!isFile) {
          filesToDelete.push(file);
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
        if (!isFile) {
          break;
        }

        filesToEmit.push(createDiskOutputFile(file, path.posix.join(asset.output, relative)));
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
