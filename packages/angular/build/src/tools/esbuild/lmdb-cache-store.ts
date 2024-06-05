/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { RootDatabase, open } from 'lmdb';
import { Cache, CacheStore } from './cache';

export class LmbdCacheStore implements CacheStore<unknown> {
  readonly #cacheFileUrl;
  #db: RootDatabase | undefined;

  constructor(readonly cachePath: string) {
    this.#cacheFileUrl = cachePath;
  }

  #ensureCacheFile(): RootDatabase {
    this.#db ??= open({
      path: this.#cacheFileUrl,
      compression: true,
    });

    return this.#db;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(key: string): Promise<any> {
    const db = this.#ensureCacheFile();
    const value = db.get(key);

    return value;
  }

  has(key: string): boolean {
    return this.#ensureCacheFile().doesExist(key);
  }

  async set(key: string, value: unknown): Promise<this> {
    const db = this.#ensureCacheFile();
    await db.put(key, value);

    return this;
  }

  createCache<V = unknown>(namespace: string): Cache<V> {
    return new Cache(this, namespace);
  }

  async close() {
    try {
      await this.#db?.close();
    } catch {
      // Failure to close should not be fatal
    }
  }
}
