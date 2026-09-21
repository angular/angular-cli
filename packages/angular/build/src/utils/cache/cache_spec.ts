/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Cache, CacheStore, MemoryCache, NamespacedCacheStore } from './cache';

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>();
  });

  it('should return cached value on subsequent getOrCreate calls', async () => {
    let callCount = 0;
    const creator = () => {
      callCount++;

      return 'value';
    };

    const val1 = await cache.getOrCreate('key', creator);
    const val2 = await cache.getOrCreate('key', creator);

    expect(val1).toBe('value');
    expect(val2).toBe('value');
    expect(callCount).toBe(1);
  });

  it('should call creator only once for concurrent getOrCreate calls with the same key', async () => {
    let callCount = 0;
    let resolveCreator!: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolveCreator = resolve;
    });

    const creator = () => {
      callCount++;

      return promise;
    };

    const p1 = cache.getOrCreate('key', creator);
    const p2 = cache.getOrCreate('key', creator);

    resolveCreator('concurrent-value');

    const [val1, val2] = await Promise.all([p1, p2]);

    expect(val1).toBe('concurrent-value');
    expect(val2).toBe('concurrent-value');
    expect(callCount).toBe(1);
  });

  it('should call creator multiple times for concurrent getOrCreate calls with different keys', async () => {
    let callCount = 0;
    const creator = (val: string) => {
      callCount++;

      return Promise.resolve(val);
    };

    const p1 = cache.getOrCreate('key1', () => creator('value1'));
    const p2 = cache.getOrCreate('key2', () => creator('value2'));

    const [val1, val2] = await Promise.all([p1, p2]);

    expect(val1).toBe('value1');
    expect(val2).toBe('value2');
    expect(callCount).toBe(2);
  });

  it('should clean up active request if creator throws/rejects', async () => {
    let callCount = 0;
    let rejectCreator!: (err: Error) => void;
    const promise = new Promise<string>((_, reject) => {
      rejectCreator = reject;
    });

    const creator = () => {
      callCount++;

      return promise;
    };

    const p1 = cache.getOrCreate('key', creator);
    const p2 = cache.getOrCreate('key', creator);

    rejectCreator(new Error('creator error'));

    await expectAsync(p1).toBeRejectedWithError('creator error');
    await expectAsync(p2).toBeRejectedWithError('creator error');

    // Subsequent call should trigger the creator again
    const p3 = cache.getOrCreate('key', () => {
      callCount++;

      return Promise.resolve('new-value');
    });
    const val3 = await p3;
    expect(val3).toBe('new-value');
    expect(callCount).toBe(2);
  });

  it('should override/clear active requests when put is called', async () => {
    let resolveCreator!: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolveCreator = resolve;
    });

    let creatorStarted!: (value: void) => void;
    const creatorStartedPromise = new Promise<void>((resolve) => {
      creatorStarted = resolve;
    });

    const creator = () => {
      creatorStarted();

      return promise;
    };

    const p1 = cache.getOrCreate('key', creator);

    // Wait for the creator to be called so that the active request is created
    await creatorStartedPromise;

    // Call put before the creator promise resolves
    await cache.put('key', 'override-value');

    resolveCreator('original-value');

    const val1 = await p1;
    // p1 was already returned, so it resolves to original-value
    expect(val1).toBe('original-value');

    // Subsequent getOrCreate should return the put/overridden value, not the resolved original-value
    const val2 = await cache.getOrCreate('key', () => 'should-not-run');
    expect(val2).toBe('override-value');
  });

  it('should delete a cached key and allow creating a new value', async () => {
    await cache.put('key', 'value-1');
    expect(await cache.get('key')).toBe('value-1');

    const deleted = cache.delete('key');
    expect(deleted).toBeTrue();
    expect(await cache.get('key')).toBeUndefined();

    // Subsequent getOrCreate should call creator
    const newValue = await cache.getOrCreate('key', () => 'value-2');
    expect(newValue).toBe('value-2');
  });

  it('should return false when deleting a non-existent key', () => {
    expect(cache.delete('non-existent')).toBeFalse();
  });

  it('should return unencoded keys in entries() and allow deletion', async () => {
    await cache.put('component/style.scss', 'content');

    const entries = Array.from(cache.entries());
    expect(entries).toEqual([['component/style.scss', 'content']]);

    expect(cache.delete(entries[0][0])).toBeTrue();
    expect(await cache.get('component/style.scss')).toBeUndefined();
  });
});

describe('NamespacedCacheStore', () => {
  class TestStore implements CacheStore<string> {
    readonly map = new Map<string, string>();

    get(key: string): string | undefined {
      return this.map.get(key);
    }

    has(key: string): boolean {
      return this.map.has(key);
    }

    set(key: string, value: string): this {
      this.map.set(key, value);

      return this;
    }
  }

  let store: TestStore;

  beforeEach(() => {
    store = new TestStore();
  });

  it('should encode namespaced keys with <length>:<namespace>:<key>', async () => {
    const namespacedStore = new NamespacedCacheStore(store, 'test-ns');
    const cache = new Cache<string>(namespacedStore);
    await cache.put('my-key', 'my-val');

    expect(store.map.has('7:test-ns:my-key')).toBeTrue();
    expect(await cache.get('my-key')).toBe('my-val');
  });

  it('should prevent collisions between namespaces containing colons', async () => {
    const cacheA = new Cache<string>(new NamespacedCacheStore(store, 'a'));
    const cacheB = new Cache<string>(new NamespacedCacheStore(store, 'a:b'));

    await cacheA.put('b:c', 'val-a');
    await cacheB.put('c', 'val-b');

    expect(await cacheA.get('b:c')).toBe('val-a');
    expect(await cacheB.get('c')).toBe('val-b');
    expect(store.map.get('1:a:b:c')).toBe('val-a');
    expect(store.map.get('3:a:b:c')).toBe('val-b');
  });

  it('should encode empty string namespace as 0::<key>', async () => {
    const namespacedStore = new NamespacedCacheStore(store, '');
    const cache = new Cache<string>(namespacedStore);
    await cache.put('key', 'val');

    expect(store.map.has('0::key')).toBeTrue();
    expect(await cache.get('key')).toBe('val');
  });

  it('should forward get, has, and set calls with the namespaced prefix', async () => {
    const namespacedStore = new NamespacedCacheStore(store, 'custom');
    await namespacedStore.set('hello', 'world');

    expect(store.map.has('6:custom:hello')).toBeTrue();
    expect(await namespacedStore.has('hello')).toBeTrue();
    expect(await namespacedStore.get('hello')).toBe('world');
  });

  it('should return this when the underlying store set is asynchronous', async () => {
    class AsyncStore implements CacheStore<string> {
      readonly map = new Map<string, string>();

      get(key: string): Promise<string | undefined> {
        return Promise.resolve(this.map.get(key));
      }

      has(key: string): Promise<boolean> {
        return Promise.resolve(this.map.has(key));
      }

      async set(key: string, value: string): Promise<this> {
        this.map.set(key, value);

        return this;
      }
    }

    const asyncStore = new AsyncStore();
    const namespacedStore = new NamespacedCacheStore(asyncStore, 'async-ns');
    const setPromise = namespacedStore.set('foo', 'bar');

    expect(setPromise instanceof Promise).toBeTrue();
    expect(await setPromise).toBe(namespacedStore);
    expect(asyncStore.map.get('8:async-ns:foo')).toBe('bar');
    expect(await namespacedStore.get('foo')).toBe('bar');
    expect(await namespacedStore.has('foo')).toBeTrue();
  });
});
