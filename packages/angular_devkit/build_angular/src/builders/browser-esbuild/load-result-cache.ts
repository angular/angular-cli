/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { OnLoadResult } from 'esbuild';

export interface LoadResultCache {
  get(path: string): OnLoadResult | undefined;
  put(path: string, result: OnLoadResult): Promise<void>;
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
        let affected = this.#fileDependencies.get(watchFile);
        if (affected === undefined) {
          affected = new Set();
          this.#fileDependencies.set(watchFile, affected);
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
