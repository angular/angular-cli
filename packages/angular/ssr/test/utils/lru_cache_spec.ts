/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { LRUCache } from '../../src/utils/lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  it('should create a cache with the correct capacity', () => {
    expect(cache.capacity).toBe(3); // Test internal capacity
  });

  it('should store and retrieve a key-value pair', () => {
    cache.put('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('nonExistentKey')).toBeUndefined();
  });

  it('should remove the least recently used item when capacity is exceeded', () => {
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('c', 3);

    // Cache is full now, adding another item should evict the least recently used ('a')
    cache.put('d', 4);

    expect(cache.get('a')).toBeUndefined(); // 'a' should be evicted
    expect(cache.get('b')).toBe(2); // 'b', 'c', 'd' should remain
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should update the value if the key already exists', () => {
    cache.put('a', 1);
    cache.put('a', 10); // Update the value of 'a'

    expect(cache.get('a')).toBe(10); // 'a' should have the updated value
  });

  it('should move the accessed key to the most recently used position', () => {
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('c', 3);

    // Access 'a', it should be moved to the most recently used position
    expect(cache.get('a')).toBe(1);

    // Adding 'd' should now evict 'b', since 'a' was just accessed
    cache.put('d', 4);

    expect(cache.get('b')).toBeUndefined(); // 'b' should be evicted
    expect(cache.get('a')).toBe(1); // 'a' should still be present
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });
});
