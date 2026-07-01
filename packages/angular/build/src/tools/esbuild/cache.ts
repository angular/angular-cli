/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * Provides infrastructure for common caching functionality within the build system.
 */

import { assertIsError } from '../../utils/error';

/**
 * A backing data store for one or more Cache instances.
 * The interface is intentionally designed to support using a JavaScript
 * Map instance as a potential cache store.
 */
export interface CacheStore<V> {
  /**
   * Returns the specified value from the cache store or `undefined` if not found.
   * @param key The key to retrieve from the store.
   */
  get(key: string): V | undefined | Promise<V | undefined>;

  /**
   * Returns whether the provided key is present in the cache store.
   * @param key The key to check from the store.
   */
  has(key: string): boolean | Promise<boolean>;

  /**
   * Adds a new value to the cache store if the key is not present.
   * Updates the value for the key if already present.
   * @param key The key to associate with the value in the cache store.
   * @param value The value to add to the cache store.
   */
  set(key: string, value: V): this | Promise<this>;
}

/**
 * A persistent backing data store that supports namespace partitioning
 * and manual lifecycle close operations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PersistentCacheStore<V = any> extends CacheStore<V> {
  createCache<T = V>(namespace: string): Cache<T>;
  close(): void | Promise<void>;
}

/**
 * A cache object that allows accessing and storing key/value pairs in
 * an underlying CacheStore. This class is the primary method for consumers
 * to use a cache.
 */
export class Cache<V, S extends CacheStore<V> = CacheStore<V>> {
  // In-flight creator promises to deduplicate concurrent requests for the same key.
  readonly #requests = new Map<string, Promise<V>>();
  // Track how many writes occurred for a key to detect mutations during await gaps.
  readonly #writeCounts = new Map<string, number>();
  // Count the number of active, pending getOrCreate operations per key to avoid memory leaks.
  readonly #pendingGets = new Map<string, number>();

  constructor(
    protected readonly store: S,
    readonly namespace?: string,
  ) {}

  #incrementWrite(key: string) {
    // Only track write counts if there is a pending getOrCreate operation active for the key.
    // This ensures that write counts are not leaked when no concurrent gets are running.
    if (this.#pendingGets.has(key)) {
      this.#writeCounts.set(key, (this.#writeCounts.get(key) || 0) + 1);
    }
  }

  /**
   * Prefixes a key with the cache namespace if present.
   * @param key A key string to prefix.
   * @returns A prefixed key if a namespace is present. Otherwise the provided key.
   */
  protected withNamespace(key: string): string {
    if (this.namespace) {
      return `${this.namespace}:${key}`;
    }

    return key;
  }

  /**
   * Gets the value associated with a provided key if available.
   * Otherwise, creates a value using the factory creator function, puts the value
   * in the cache, and returns the new value.
   * @param key A key associated with the value.
   * @param creator A factory function for the value if no value is present.
   * @returns A value associated with the provided key.
   */
  async getOrCreate(key: string, creator: () => V | Promise<V>): Promise<V> {
    const namespacedKey = this.withNamespace(key);

    // 1. If another call is already running the creator for this key, share its promise.
    let activeRequest = this.#requests.get(namespacedKey);
    if (activeRequest !== undefined) {
      return activeRequest;
    }

    // Increment pending gets count to enable write-tracking for this key.
    const currentPending = this.#pendingGets.get(namespacedKey) || 0;
    this.#pendingGets.set(namespacedKey, currentPending + 1);

    try {
      const startWriteCount = this.#writeCounts.get(namespacedKey) || 0;

      // 2. Query the backing store. Since store.get can be async, we yield to the event loop.
      const value = await this.store.get(namespacedKey);

      // If a write (e.g. put) occurred during the store.get await gap, we must abort
      // the current execution and restart to ensure we return the newly written value.
      if ((this.#writeCounts.get(namespacedKey) || 0) !== startWriteCount) {
        return this.getOrCreate(key, creator);
      }

      if (value !== undefined) {
        return value;
      }

      // 3. Recheck active request after the await gap in case another concurrent call
      // initiated a creator during the store.get wait.
      activeRequest = this.#requests.get(namespacedKey);
      if (activeRequest !== undefined) {
        return activeRequest;
      }

      // 4. Run the creator to produce the new value, and store its promise in #requests.
      activeRequest = Promise.resolve(creator()).then(
        async (newValue) => {
          // Ensure this request is still the active one before writing back to the store
          // (prevents overwriting newer data if put() was called before resolution).
          if (this.#requests.get(namespacedKey) === activeRequest) {
            this.#incrementWrite(namespacedKey);
            await this.store.set(namespacedKey, newValue);
            this.#requests.delete(namespacedKey);
          }

          return newValue;
        },
        (error) => {
          // Clean up the active request if the creator fails.
          if (this.#requests.get(namespacedKey) === activeRequest) {
            this.#requests.delete(namespacedKey);
          }
          throw error;
        },
      );

      this.#requests.set(namespacedKey, activeRequest);

      return activeRequest;
    } finally {
      // Clean up write counts and pending gets once all concurrent gets for this key finish.
      const current = this.#pendingGets.get(namespacedKey) || 0;
      if (current <= 1) {
        this.#pendingGets.delete(namespacedKey);
        this.#writeCounts.delete(namespacedKey);
      } else {
        this.#pendingGets.set(namespacedKey, current - 1);
      }
    }
  }

  /**
   * Gets the value associated with a provided key if available.
   * @param key A key associated with the value.
   * @returns A value associated with the provided key if present. Otherwise, `undefined`.
   */
  async get(key: string): Promise<V | undefined> {
    const value = await this.store.get(this.withNamespace(key));

    return value;
  }

  /**
   * Puts a value in the cache and associates it with the provided key.
   * If the key is already present, the value is updated instead.
   * @param key A key associated with the value.
   * @param value A value to put in the cache.
   */
  async put(key: string, value: V): Promise<void> {
    const namespacedKey = this.withNamespace(key);
    this.#requests.delete(namespacedKey);
    this.#incrementWrite(namespacedKey);
    await this.store.set(namespacedKey, value);
  }

  /**
   * Clears the base class internal state (requests, write counts, and pending gets).
   */
  protected clearInternal(): void {
    this.#requests.clear();
    this.#writeCounts.clear();
    this.#pendingGets.clear();
  }
}

/**
 * A lightweight in-memory cache implementation based on a JavaScript Map object.
 */
export class MemoryCache<V> extends Cache<V, Map<string, V>> {
  constructor() {
    super(new Map());
  }

  /**
   * Removes all entries from the cache instance.
   */
  clear() {
    this.clearInternal();
    this.store.clear();
  }

  /**
   * Provides all the values currently present in the cache instance.
   * @returns An iterable of all values in the cache.
   */
  values() {
    return this.store.values();
  }

  /**
   * Provides all the keys/values currently present in the cache instance.
   * @returns An iterable of all key/value pairs in the cache.
   */
  entries() {
    return this.store.entries();
  }
}

/**
 * Creates and returns a persistent cache store.
 * Attempts to use the native LMDB store first, and falls back to the built-in SQLite store
 * if LMDB fails to initialize.
 *
 * @param baseCachePath The base path of the cache file/directory without suffix/extension.
 * @returns A promise resolving to a PersistentCacheStore instance.
 */
export async function createPersistentCacheStore(
  baseCachePath: string,
): Promise<PersistentCacheStore> {
  try {
    const { LmdbCacheStore } = await import('./lmdb-cache-store');

    return new LmdbCacheStore(baseCachePath + '.db');
  } catch (lmdbError) {
    try {
      const { SqliteCacheStore } = await import('./sqlite-cache-store');

      return new SqliteCacheStore(baseCachePath + '-sqlite.db');
    } catch (sqliteError) {
      assertIsError(lmdbError);
      assertIsError(sqliteError);

      throw new Error(
        'Unable to initialize JavaScript cache storage.\n' +
          `LMDB error: ${lmdbError.message.split('\n')[0]}\n` +
          `SQLite error: ${sqliteError.message.split('\n')[0]}`,
        { cause: sqliteError },
      );
    }
  }
}
