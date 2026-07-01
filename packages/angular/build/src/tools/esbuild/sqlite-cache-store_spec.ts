/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { SqliteCacheStore } from './sqlite-cache-store';

describe('SqliteCacheStore', () => {
  let tempDir: string;
  let cachePath: string;
  let store: SqliteCacheStore;

  beforeEach(async () => {
    // Create a temporary directory in the workspace for testing
    tempDir = join(__dirname, `sqlite-test-temp-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    cachePath = join(tempDir, 'test-cache.db');
    store = new SqliteCacheStore(cachePath);
  });

  afterEach(async () => {
    store.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should store and retrieve a value', async () => {
    const data = { foo: 'bar', list: [1, 2, 3] };
    await store.set('test-key', data);

    const result = await store.get('test-key');
    expect(result).toEqual(data);
  });

  it('should return undefined for non-existent key', async () => {
    const result = await store.get('missing-key');
    expect(result).toBeUndefined();
  });

  it('should correctly report existence of a key', async () => {
    expect(store.has('exist-key')).toBeFalse();

    await store.set('exist-key', 'value');
    expect(store.has('exist-key')).toBeTrue();
  });

  it('should overwrite values for existing keys', async () => {
    await store.set('overwrite-key', 'initial');
    await store.set('overwrite-key', 'updated');

    const result = await store.get('overwrite-key');
    expect(result).toBe('updated');
  });

  it('should prune items older than TTL on close', async () => {
    // Write two items
    await store.set('new-key', 'new-val');
    await store.set('old-key', 'old-val');

    // Close the store so we can modify the DB safely
    store.close();

    // Directly open database to update timestamp of 'old-key' to 15 days ago
    const { DatabaseSync } = await import('node:sqlite');
    const directDb = new DatabaseSync(cachePath);
    directDb
      .prepare('UPDATE cache SET last_accessed = unixepoch() - 15 * 24 * 3600 WHERE key = ?')
      .run('old-key');
    directDb.close();

    // Reopen store with a 14-day TTL, access it to open connection, then close to trigger pruning
    const pruneStore = new SqliteCacheStore(cachePath, undefined, 14);
    expect(pruneStore.has('new-key')).toBeTrue();
    pruneStore.close();

    // Verify 'old-key' is gone but 'new-key' remains
    const checkStore = new SqliteCacheStore(cachePath);
    expect(checkStore.has('old-key')).toBeFalse();
    expect(checkStore.has('new-key')).toBeTrue();
    checkStore.close();
  });

  it('should prune oldest items when total payload size exceeds maximum on close', async () => {
    // Close the default store so we can instantiate one with a small limit
    store.close();

    // Create a store with a tiny size limit (e.g. 25 bytes)
    // Keys 'k1', 'k2', 'k3' are small (each is 10 bytes: key + JSON.stringify(value)).
    // Total size of k1 + k2 + k3 is 30 bytes, which exceeds the 25 bytes limit.
    const sizeStore = new SqliteCacheStore(cachePath, 25);

    // Set k1, then k2, then k3.
    // Order of inserts: k1 (oldest), k2 (middle), k3 (newest)
    await sizeStore.set('k1', 'value1');
    await sizeStore.set('k2', 'value2');
    await sizeStore.set('k3', 'value3');

    // Close sizeStore to trigger pruning
    sizeStore.close();

    // Reopen to check which keys were kept
    const checkStore = new SqliteCacheStore(cachePath);
    // k3 (newest) and k2 (middle) should be kept (~20 bytes total)
    // k1 (oldest) should be pruned to get under 25 bytes.
    expect(checkStore.has('k3')).toBeTrue();
    expect(checkStore.has('k2')).toBeTrue();
    expect(checkStore.has('k1')).toBeFalse();
    checkStore.close();
  });
});
