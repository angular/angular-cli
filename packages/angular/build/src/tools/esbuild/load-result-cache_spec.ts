/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { MemoryLoadResultCache } from './load-result-cache';

describe('MemoryLoadResultCache', () => {
  let cache: MemoryLoadResultCache;

  beforeEach(() => {
    cache = new MemoryLoadResultCache();
  });

  it('should store and retrieve results', async () => {
    const result = {
      contents: 'body { color: red; }',
      loader: 'css' as const,
    };

    await cache.put('file:/test/styles.css', result);
    const cached = cache.get('file:/test/styles.css');

    expect(cached).toBe(result);
  });

  it('should track watch files in fileDependencies', async () => {
    const result = {
      contents: 'body { color: red; }',
      loader: 'css' as const,
      watchFiles: ['/test/styles.css', '/test/theme.json'],
    };

    await cache.put('file:/test/styles.css', result);

    expect(cache.watchFiles).toContain('/test/styles.css');
    expect(cache.watchFiles).toContain('/test/theme.json');
  });

  it('should invalidate cached results when a dependency changes', async () => {
    const result = {
      contents: 'body { color: red; }',
      loader: 'css' as const,
      watchFiles: ['/test/styles.css', '/test/theme.json'],
    };

    await cache.put('file:/test/styles.css', result);
    expect(cache.get('file:/test/styles.css')).toBe(result);

    const invalidated = cache.invalidate('/test/theme.json');
    expect(invalidated).toBeTrue();
    expect(cache.get('file:/test/styles.css')).toBeUndefined();
  });

  it('should preserve previous watch files when caching an error result', async () => {
    const successResult = {
      contents: 'body { color: red; }',
      loader: 'css' as const,
      watchFiles: ['/test/styles.css', '/test/theme.json'],
    };

    await cache.put('file:/test/styles.css', successResult);
    cache.invalidate('/test/theme.json');

    // Simulate an incremental rebuild error result that only has the entry file in watchFiles
    const errorResult = {
      errors: [{ text: 'Syntax error in theme.json' }],
      watchFiles: ['/test/styles.css'],
    };

    await cache.put('file:/test/styles.css', errorResult);

    // Both the entry file and the previous dependency should be tracked
    expect(cache.watchFiles).toContain('/test/styles.css');
    expect(cache.watchFiles).toContain('/test/theme.json');

    // Invalidating the dependency should clear the cached error result
    const invalidated = cache.invalidate('/test/theme.json');
    expect(invalidated).toBeTrue();
    expect(cache.get('file:/test/styles.css')).toBeUndefined();
  });

  it('should clean up previous file dependencies when put updates watchFiles', async () => {
    const initialResult = {
      contents: 'body { color: red; }',
      loader: 'css' as const,
      watchFiles: ['/test/styles.css', '/test/old-dep.json'],
    };

    await cache.put('file:/test/styles.css', initialResult);
    expect(cache.watchFiles).toContain('/test/old-dep.json');

    // Update with new watch files (not containing old-dep.json)
    const updatedResult = {
      contents: 'body { color: blue; }',
      loader: 'css' as const,
      watchFiles: ['/test/styles.css', '/test/new-dep.json'],
    };

    await cache.put('file:/test/styles.css', updatedResult);
    expect(cache.watchFiles).not.toContain('/test/old-dep.json');
    expect(cache.watchFiles).toContain('/test/new-dep.json');

    // Invalidating old dependency should not affect the cache
    expect(cache.invalidate('/test/old-dep.json')).toBeFalse();
    expect(cache.get('file:/test/styles.css')).toBe(updatedResult);

    // Invalidating new dependency should invalidate the cache
    expect(cache.invalidate('/test/new-dep.json')).toBeTrue();
    expect(cache.get('file:/test/styles.css')).toBeUndefined();
    // Invalidating a file marks its cached results stale, but preserves watch file tracking
    // so the file watcher continues monitoring the dependency for subsequent changes until
    // a new build pass (via put) updates the active dependencies.
    expect(cache.watchFiles).toContain('/test/new-dep.json');
  });
});
