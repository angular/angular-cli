/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { OnLoadResult, PluginBuild } from 'esbuild';
import { normalize } from 'node:path';

export interface LoadResultCache {
  get(path: string): OnLoadResult | undefined;
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
    let result: OnLoadResult | null | undefined = cache.get(loadCacheKey);

    if (result === undefined) {
      result = await callback(args);

      // Do not cache null or undefined
      if (result) {
        // Ensure requested path is included if it was a resolved file
        if (args.namespace === 'file') {
          result.watchFiles ??= [];
          result.watchFiles.push(args.path);
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

  get(path: string): OnLoadResult | undefined {
    return this.#loadResults.get(path);
  }

  async put(path: string, result: OnLoadResult): Promise<void> {
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
}
