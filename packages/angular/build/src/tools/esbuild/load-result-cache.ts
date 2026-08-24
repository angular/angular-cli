/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { OnLoadResult, PluginBuild } from 'esbuild';
import { normalize } from 'node:path';

export interface LoadResultCache {
  get(path: string): OnLoadResult | Promise<OnLoadResult | undefined> | undefined;
  put(path: string, result: OnLoadResult): Promise<void>;
  readonly watchFiles: ReadonlyArray<string>;
}

export function createCachedLoad(
  cache: LoadResultCache | undefined,
  callback: Parameters<PluginBuild['onLoad']>[1],
): Parameters<PluginBuild['onLoad']>[1] {
  if (cache === undefined) {
    return callback;
  }

  return async (args) => {
    const loadCacheKey = `${args.namespace}:${args.path}`;
    let result: OnLoadResult | null | undefined = await cache.get(loadCacheKey);

    if (result === undefined) {
      result = await callback(args);

      // Do not cache null or undefined
      if (result) {
        // Ensure requested path is included if it was a resolved file
        if (args.namespace === 'file') {
          result.watchFiles ??= [];
          if (!result.watchFiles.includes(args.path)) {
            result.watchFiles.push(args.path);
          }
        }
        await cache.put(loadCacheKey, result);
      }
    }

    return result;
  };
}

export class MemoryLoadResultCache implements LoadResultCache {
  #loadResults = new Map<string, OnLoadResult>();
  #fileDependencies = new Map<string, Set<string>>();
  #watchFilesPerKey = new Map<string, ReadonlyArray<string>>();

  get(path: string): OnLoadResult | undefined {
    return this.#loadResults.get(path);
  }

  async put(path: string, result: OnLoadResult): Promise<void> {
    const previousWatchFiles = this.#watchFilesPerKey.get(path);

    if (result.errors && result.errors.length > 0) {
      if (previousWatchFiles) {
        result.watchFiles = Array.from(
          new Set([...(result.watchFiles ?? []), ...previousWatchFiles]),
        );
      }
    }

    const currentNormalizedWatchFiles = new Set(result.watchFiles?.map(normalize) ?? []);

    // Clean up any previous file dependencies that are no longer referenced
    if (previousWatchFiles) {
      for (const watchFile of previousWatchFiles) {
        const normalizedWatchFile = normalize(watchFile);
        if (!currentNormalizedWatchFiles.has(normalizedWatchFile)) {
          const affected = this.#fileDependencies.get(normalizedWatchFile);
          if (affected) {
            affected.delete(path);
            if (affected.size === 0) {
              this.#fileDependencies.delete(normalizedWatchFile);
            }
          }
        }
      }
    }

    if (result.watchFiles && result.watchFiles.length > 0) {
      this.#watchFilesPerKey.set(path, [...result.watchFiles]);
    } else {
      this.#watchFilesPerKey.delete(path);
    }

    this.#loadResults.set(path, result);
    if (result.watchFiles) {
      for (const watchFile of result.watchFiles) {
        // Normalize the watch file path to ensure OS consistent paths
        const normalizedWatchFile = normalize(watchFile);
        let affected = this.#fileDependencies.get(normalizedWatchFile);
        if (affected === undefined) {
          affected = new Set();
          this.#fileDependencies.set(normalizedWatchFile, affected);
        }
        affected.add(path);
      }
    }
  }

  invalidate(path: string): boolean {
    const affectedPaths = this.#fileDependencies.get(path);
    let found = false;

    if (affectedPaths) {
      for (const affected of affectedPaths) {
        if (this.#loadResults.delete(affected)) {
          found = true;
        }
      }
      this.#fileDependencies.delete(path);
    }

    return found;
  }

  get watchFiles(): string[] {
    // this.#loadResults.keys() is not included here because the keys
    // are namespaced request paths and not disk-based file paths.
    return [...this.#fileDependencies.keys()];
  }

  clear(): void {
    this.#loadResults.clear();
    this.#fileDependencies.clear();
    this.#watchFilesPerKey.clear();
  }
}
