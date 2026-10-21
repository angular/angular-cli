/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lstatSync, statSync } from 'node:fs';
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
 * Normalizes a glob pattern to match `tinyglobby` semantics by stripping trailing slashes,
 * expanding directory patterns with `/**`, and normalizing POSIX segments.
 *
 * @param pattern The raw glob pattern string.
 * @returns The normalized POSIX glob pattern.
 */
function normalizeGlobPattern(pattern: string): string {
  let result = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
  if (pattern.endsWith('/') || !result.endsWith('*')) {
    result += '/**';
  }

  return path.posix.normalize(result);
}

/**
 * Resolves the candidate POSIX source file path within `matcher` that would map to `outputPath`,
 * or `undefined` if `outputPath` is outside `matcher.asset.output` or does not match `matcher`.
 */
function getCandidateSourceForOutput(
  matcher: AssetMatcher,
  outputPath: string,
): string | undefined {
  const relative = path.posix.relative(matcher.asset.output, outputPath);
  if (!relative || relative.startsWith('..') || path.posix.isAbsolute(relative)) {
    return undefined;
  }

  return matcher.isMatch(relative) ? `${matcher.prefix}${relative}` : undefined;
}

/**
 * Checks whether a POSIX path exists on disk as a file, respecting `followSymlinks`.
 */
function isMatchingAssetFile(file: string, followSymlinks: boolean | undefined): boolean {
  return followSymlinks
    ? (statSync(file, { throwIfNoEntry: false })?.isFile() ?? false)
    : (lstatSync(file, { throwIfNoEntry: false })?.isFile() ?? false);
}

/**
 * Compiles picomatch matchers and POSIX input prefixes for each asset configuration.
 *
 * @param assets The normalized asset patterns with POSIX input and output paths.
 * @returns An array of compiled asset matcher descriptors.
 */
export function createAssetMatchers(assets: NormalizedAssetsPattern[]): readonly AssetMatcher[] {
  return assets.map((asset) => {
    const { glob: rawGlob, ignore: rawIgnore, input } = asset;
    const ignore = [...DEFAULT_ASSET_IGNORE, ...(rawIgnore ?? [])]
      .filter((pattern) => pattern.length > 0)
      .map(normalizeGlobPattern);
    const isMatch = picomatch(rawGlob ? path.posix.normalize(rawGlob) : [], {
      dot: true,
      windows: false,
      ignore,
    });
    const prefix = input.endsWith('/') ? input : `${input}/`;

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
  emittedAssets: ReadonlyMap<string, ReadonlySet<string>>,
  modifiedFiles?: ReadonlySet<string>,
  assetMatchers?: readonly AssetMatcher[],
): Promise<CollectedAssets> {
  if (assets.length === 0 || modifiedFiles?.size === 0) {
    return { filesToEmit: [], filesToDelete: [] };
  }

  if (modifiedFiles) {
    const matchers = assetMatchers ?? createAssetMatchers(assets);
    const filesToEmit = new Map<string, { file: DiskOutputFile; matcherIndex: number }>();
    const filesToDelete = new Set<string>();

    for (const file of modifiedFiles) {
      let isFileStat: boolean | undefined;
      let isFileLstat: boolean | undefined;

      if (!emittedAssets.has(file) && emittedAssets.size > 0) {
        const dirPrefix = file.endsWith('/') ? file : `${file}/`;
        let isDirectory: boolean | undefined;
        for (const emittedFile of emittedAssets.keys()) {
          if (emittedFile.startsWith(dirPrefix)) {
            if (isDirectory === undefined) {
              const stats = statSync(file, { throwIfNoEntry: false });
              isDirectory = stats?.isDirectory() ?? false;
              isFileStat = stats?.isFile() ?? false;
              if (isDirectory) {
                break;
              }
            }
            filesToDelete.add(emittedFile);
          }
        }
        if (isDirectory !== undefined && !isFileStat) {
          continue;
        }
      }

      let matched = false;
      for (let matcherIndex = 0; matcherIndex < matchers.length; matcherIndex++) {
        const { asset, prefix, isMatch } = matchers[matcherIndex];
        if (!file.startsWith(prefix)) {
          continue;
        }

        const relative = file.slice(prefix.length);
        if (!isMatch(relative)) {
          continue;
        }

        const isFile = asset.followSymlinks
          ? (isFileStat ??= statSync(file, { throwIfNoEntry: false })?.isFile() ?? false)
          : (isFileLstat ??= lstatSync(file, { throwIfNoEntry: false })?.isFile() ?? false);
        if (!isFile) {
          continue;
        }

        matched = true;
        const outputFile = createDiskOutputFile(file, path.posix.join(asset.output, relative));
        const existing = filesToEmit.get(outputFile.path);
        if (!existing || matcherIndex >= existing.matcherIndex) {
          filesToEmit.set(outputFile.path, { file: outputFile, matcherIndex });
        }
      }

      if (emittedAssets.has(file) && !matched) {
        filesToDelete.add(file);
      }
    }

    if (matchers.length > 1) {
      // Ensure lower-priority modified assets do not overwrite existing higher-priority assets on disk.
      for (const [outputPath, { file, matcherIndex }] of filesToEmit) {
        for (let laterIndex = matchers.length - 1; laterIndex > matcherIndex; laterIndex--) {
          const laterMatcher = matchers[laterIndex];
          const candidateFile = getCandidateSourceForOutput(laterMatcher, outputPath);
          if (!candidateFile || candidateFile === file.source) {
            continue;
          }

          if (isMatchingAssetFile(candidateFile, laterMatcher.asset.followSymlinks)) {
            if (emittedAssets.get(candidateFile)?.has(outputPath)) {
              filesToEmit.delete(outputPath);
            } else {
              filesToEmit.set(outputPath, {
                file: createDiskOutputFile(candidateFile, outputPath),
                matcherIndex: laterIndex,
              });
            }
            break;
          } else if (emittedAssets.get(candidateFile)?.has(outputPath)) {
            filesToDelete.add(candidateFile);
          }
        }
      }

      // Restore lower-priority fallback assets when a higher-priority overriding asset is deleted.
      for (const deletedFile of filesToDelete) {
        for (
          let deletedMatcherIndex = 0;
          deletedMatcherIndex < matchers.length;
          deletedMatcherIndex++
        ) {
          const { asset, prefix, isMatch } = matchers[deletedMatcherIndex];
          if (!deletedFile.startsWith(prefix)) {
            continue;
          }

          const relative = deletedFile.slice(prefix.length);
          if (!isMatch(relative)) {
            continue;
          }

          const outputPath = path.posix.join(asset.output, relative);
          if (filesToEmit.has(outputPath)) {
            continue;
          }

          for (let candidateIndex = matchers.length - 1; candidateIndex >= 0; candidateIndex--) {
            if (candidateIndex === deletedMatcherIndex) {
              continue;
            }

            const candidateMatcher = matchers[candidateIndex];
            const candidateFile = getCandidateSourceForOutput(candidateMatcher, outputPath);
            if (!candidateFile || filesToDelete.has(candidateFile)) {
              continue;
            }

            if (isMatchingAssetFile(candidateFile, candidateMatcher.asset.followSymlinks)) {
              if (
                candidateIndex < deletedMatcherIndex ||
                !emittedAssets.get(candidateFile)?.has(outputPath)
              ) {
                filesToEmit.set(outputPath, {
                  file: createDiskOutputFile(candidateFile, outputPath),
                  matcherIndex: candidateIndex,
                });
              }
              break;
            } else if (emittedAssets.get(candidateFile)?.has(outputPath)) {
              filesToDelete.add(candidateFile);
            }
          }
        }
      }
    }

    return {
      filesToEmit: Array.from(filesToEmit.values(), ({ file }) => file),
      filesToDelete: Array.from(filesToDelete),
    };
  }

  const resolvedAssets = await resolveAssets(assets, workspaceRoot);
  const filesToEmit = new Map<string, DiskOutputFile>();
  for (const { source, destination } of resolvedAssets) {
    const outputFile = createDiskOutputFile(source, destination);
    filesToEmit.set(outputFile.path, outputFile);
  }

  return {
    filesToEmit: Array.from(filesToEmit.values()),
    filesToDelete: [],
  };
}
