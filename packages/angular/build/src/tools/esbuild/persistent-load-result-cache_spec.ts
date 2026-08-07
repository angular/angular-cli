/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { OnLoadResult } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initializeHash } from '../../utils/hash';
import type { Cache as PersistentCacheStore } from './cache';
import {
  type CachedLoadResultEntry,
  PersistentLoadResultCache,
  extractDiskFilePath,
} from './persistent-load-result-cache';

describe('extractDiskFilePath', () => {
  it('should extract disk file path for file: URIs', () => {
    const filePath = '/Users/test/project/file.js';
    expect(extractDiskFilePath(`file://${filePath}`)).toBe(filePath);
  });

  it('should extract disk file path for custom plugin namespaces', () => {
    const filePath = '/Users/test/project/file.js';
    expect(extractDiskFilePath(`sass:${filePath}`)).toBe(filePath);
  });

  it('should not strip Windows drive letter as a namespace prefix', () => {
    const winPath = 'C:/Users/test/project/file.js';
    expect(extractDiskFilePath(winPath)).not.toBe('/Users/test/project/file.js');
  });
});

describe('PersistentLoadResultCache', () => {
  let mockStore: Map<string, CachedLoadResultEntry>;
  let persistentStore: PersistentCacheStore<CachedLoadResultEntry>;
  let tmpDir: string;
  let file1: string;

  beforeAll(async () => {
    await initializeHash();
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'persistent-cache-test-'));
    file1 = path.join(tmpDir, 'test.js');
    fs.writeFileSync(file1, 'console.log("hello");');

    mockStore = new Map();
    persistentStore = {
      async get(key: string) {
        return mockStore.get(key);
      },
      async put(key: string, value: CachedLoadResultEntry) {
        mockStore.set(key, value);
      },
    } as unknown as PersistentCacheStore<CachedLoadResultEntry>;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return undefined on L1 and L2 cache miss', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const result = await cache.get(file1);
    expect(result).toBeUndefined();
  });

  it('should hit L2 persistent store and return cached output when dependencies are valid', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const sampleResult: OnLoadResult = {
      contents: 'console.log("hello");',
      loader: 'js',
      watchFiles: [file1],
    };

    await cache.put(file1, sampleResult);

    // Create a second cache instance (simulating cold start)
    const coldCache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const hit = await coldCache.get(file1);

    expect(hit).toBeDefined();
    expect(hit?.contents).toBe('console.log("hello");');
    expect(hit?.loader).toBe('js');
  });

  it('should hit L2 persistent store and return cached output for empty file contents', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const sampleResult: OnLoadResult = {
      contents: '',
      loader: 'css',
      watchFiles: [file1],
    };

    await cache.put(file1, sampleResult);

    // Create a second cache instance (simulating cold start)
    const coldCache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const hit = await coldCache.get(file1);

    expect(hit).toBeDefined();
    expect(hit?.contents).toBe('');
    expect(hit?.loader).toBe('css');
  });

  it('should preserve watchDirs when hitting L2 persistent store', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const sampleResult: OnLoadResult = {
      contents: 'console.log("hello");',
      loader: 'js',
      watchFiles: [file1],
      watchDirs: [tmpDir],
    };

    await cache.put(file1, sampleResult);

    const coldCache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const hit = await coldCache.get(file1);

    expect(hit).toBeDefined();
    expect(hit?.watchDirs).toEqual([tmpDir]);
  });

  it('should hit L2 persistent store for custom plugin namespaces backed by disk files', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const customPath = `sass:${file1}`;
    const sampleResult: OnLoadResult = {
      contents: '.btn { color: red; }',
      loader: 'css',
      watchFiles: [file1],
    };

    await cache.put(customPath, sampleResult);

    const coldCache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const hit = await coldCache.get(customPath);

    expect(hit).toBeDefined();
    expect(hit?.contents).toBe('.btn { color: red; }');
    expect(hit?.loader).toBe('css');
  });

  it('should hit L2 persistent store for virtual modules without disk representation', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const virtualPath = 'angular:styles/component:css;0;data';
    const sampleResult: OnLoadResult = {
      contents: 'h1 { margin: 0; }',
      loader: 'css',
      watchFiles: [file1],
    };

    await cache.put(virtualPath, sampleResult);

    const coldCache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const hit = await coldCache.get(virtualPath);

    expect(hit).toBeDefined();
    expect(hit?.contents).toBe('h1 { margin: 0; }');
    expect(hit?.loader).toBe('css');
  });

  it('should invalidate L2 persistent cache hit if a watch dependency file is modified', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const sampleResult: OnLoadResult = {
      contents: 'console.log("hello");',
      loader: 'js',
      watchFiles: [file1],
    };

    await cache.put(file1, sampleResult);

    // Modify dependency file content
    fs.writeFileSync(file1, 'console.log("world");');

    const coldCache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const hit = await coldCache.get(file1);

    expect(hit).toBeUndefined();
  });

  it('should heal the cache entry with new metadata if content hash is still valid after mtime changes', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const sampleResult: OnLoadResult = {
      contents: 'console.log("hello");',
      loader: 'js',
      watchFiles: [file1],
    };

    await cache.put(file1, sampleResult);

    // Retrieve the cache key from store
    const keys = Array.from(mockStore.keys());
    expect(keys.length).toBe(1);
    const cacheKey = keys[0];

    const initialEntry = mockStore.get(cacheKey);
    const initialMtime = initialEntry?.watchFilesMetadata[file1].mtimeMs;
    expect(initialMtime).toBeDefined();

    // Artificially change file modification time without changing content
    const futureTime = new Date(Date.now() + 50000);
    fs.utimesSync(file1, futureTime, futureTime);

    const statsAfter = fs.statSync(file1);
    expect(statsAfter.mtimeMs).not.toEqual(initialMtime as number);

    // Query cold cache to trigger fallback content hash check and healing
    const coldCache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const hit = await coldCache.get(file1);

    expect(hit).toBeDefined();
    expect(hit?.contents).toBe('console.log("hello");');

    // Verify metadata was healed in-place in the persistent store
    const healedEntry = mockStore.get(cacheKey);
    expect(healedEntry?.watchFilesMetadata[file1].mtimeMs).toEqual(statsAfter.mtimeMs);
  });

  it('should safely handle corrupted cache entries with missing watchFilesMetadata', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const sampleResult: OnLoadResult = {
      contents: 'console.log("hello");',
      loader: 'js',
      watchFiles: [file1],
    };

    await cache.put(file1, sampleResult);

    // Corrupt entry in store by removing watchFilesMetadata
    const keys = Array.from(mockStore.keys());
    expect(keys.length).toBe(1);
    const entry = mockStore.get(keys[0]);
    expect(entry).toBeDefined();
    if (entry) {
      delete (entry as Partial<CachedLoadResultEntry>).watchFilesMetadata;
    }

    const coldCache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const hit = await coldCache.get(file1);

    expect(hit).toBeUndefined();
  });

  it('should skip L2 store put if target file cannot be read from disk', async () => {
    const cache = new PersistentLoadResultCache(persistentStore, 'global-hash');
    const nonExistentFile = path.join(tmpDir, 'non-existent.js');
    const sampleResult: OnLoadResult = {
      contents: 'console.log("missing");',
      loader: 'js',
      watchFiles: [],
    };

    await cache.put(nonExistentFile, sampleResult);

    expect(mockStore.size).toBe(0);
  });
});
