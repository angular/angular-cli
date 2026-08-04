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
});
