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

      // Do not cache null or undefined or results with errors
      if (result && result.errors === undefined) {
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
    const affected = this.#fileDependencies.get(path);
    let found = false;

    if (affected) {
      affected.forEach((a) => (found ||= this.#loadResults.delete(a)));
      this.#fileDependencies.delete(path);
    }

    found ||= this.#loadResults.delete(path);

    return found;
  }
}
