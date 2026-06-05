/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { MemoryCache } from './cache';

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
});
