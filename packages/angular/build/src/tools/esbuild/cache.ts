/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @fileoverview
 * Provides infrastructure for common caching functionality within the build system.
 */

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
 * A cache object that allows accessing and storing key/value pairs in
 * an underlying CacheStore. This class is the primary method for consumers
 * to use a cache.
 */
export class Cache<V, S extends CacheStore<V> = CacheStore<V>> {
  constructor(
    protected readonly store: S,
    readonly namespace?: string,
  ) {}

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
    let value = await this.store.get(namespacedKey);

    if (value === undefined) {
      value = await creator();
      await this.store.set(namespacedKey, value);
    }

    return value;
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
    await this.store.set(this.withNamespace(key), value);
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
    this.store.clear();
  }

  /**
   * Provides all the values currently present in the cache instance.
   * @returns An iterable of all values in the cache.
   */
  values() {
    return this.store.values();
  }
}
