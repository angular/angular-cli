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

  it('should preserve binary values', async () => {
    const data = new TextEncoder().encode('export const value = 1;\n');
    await store.set('binary-key', data);

    const result = await store.get('binary-key');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toEqual(data);
  });

  it('should preserve binary values nested within an object', async () => {
    const data = {
      contents: new TextEncoder().encode('export const value = 1;\n'),
      loader: 'js',
      watchFiles: ['/some/file.js'],
    };
    await store.set('nested-binary-key', data);

    const result = await store.get('nested-binary-key');
    expect(result.contents).toBeInstanceOf(Uint8Array);
    expect(result).toEqual(data);
  });

  it('should preserve binary values across store instances', async () => {
    const data = new TextEncoder().encode('export const value = 1;\n');
    await store.set('persisted-binary-key', data);
    store.close();

    const reopenedStore = new SqliteCacheStore(cachePath);
    try {
      const result = await reopenedStore.get('persisted-binary-key');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toEqual(data);
    } finally {
      reopenedStore.close();
    }
  });

  it('should treat a corrupt payload as a cache miss', async () => {
    await store.set('corrupt-key', 'value');
    store.close();

    // Simulate an entry with an invalid/corrupt payload that fails deserialization.
    const { DatabaseSync } = await import('node:sqlite');
    const directDb = new DatabaseSync(cachePath);
    directDb
      .prepare('UPDATE cache SET value = ? WHERE key = ?')
      .run(new Uint8Array([0x00, 0x01, 0x02]), 'corrupt-key');
    directDb.close();

    const reopenedStore = new SqliteCacheStore(cachePath);
    try {
      expect(await reopenedStore.get('corrupt-key')).toBeUndefined();
    } finally {
      reopenedStore.close();
    }
  });

  it('should automatically recover from a corrupted database file', async () => {
    // Write corrupted header data to the database file
    await fs.writeFile(cachePath, 'CORRUPTED_DATABASE_FILE_CONTENTS');

    // The store should detect corruption, reset the database files, and operate normally
    await store.set('recover-key', 'recovered-value');
    const result = await store.get('recover-key');
    expect(result).toBe('recovered-value');
  });

  it('should automatically recover from a corrupted B-tree page', async () => {
    // Initialize valid database
    await store.set('initial-key', 'initial-val');
    store.close();

    // Overwrite page data with garbage
    const handle = await fs.open(cachePath, 'r+');
    await handle.write(Buffer.alloc(200, 0xff), 0, 200, 100);
    await handle.close();

    const reopenedStore = new SqliteCacheStore(cachePath);
    try {
      await reopenedStore.set('new-key', 'new-val');
      expect(await reopenedStore.get('new-key')).toBe('new-val');
    } finally {
      reopenedStore.close();
    }
  });

  it('should gracefully degrade when database path is permanently unwritable', async () => {
    // A regular file in place of a directory path ensures unwritability across all platforms (ENOTDIR)
    const blockingFile = join(tempDir, 'blocking-file');
    await fs.writeFile(blockingFile, 'cannot-be-a-directory');

    const unwritableStore = new SqliteCacheStore(join(blockingFile, 'cannot-create.db'));
    try {
      expect(unwritableStore.has('any-key')).toBeFalse();
      expect(await unwritableStore.get('any-key')).toBeUndefined();
      await unwritableStore.set('any-key', 'any-val');
      expect(await unwritableStore.get('any-key')).toBeUndefined();
      expect(unwritableStore.has('any-key')).toBeFalse();
    } finally {
      unwritableStore.close();
    }
  });

  it('should automatically recover from a corrupted journal file', async () => {
    await store.set('key-before', 'val-before');
    store.close();

    // Create a corrupt rollback journal file
    await fs.writeFile(cachePath + '-journal', 'CORRUPTED_JOURNAL_FILE');

    const reopenedStore = new SqliteCacheStore(cachePath);
    try {
      await reopenedStore.set('new-key', 'new-val');
      expect(await reopenedStore.get('new-key')).toBe('new-val');
    } finally {
      reopenedStore.close();
    }
  });

  it('should not delete database files when database is locked by another process', async () => {
    await store.set('persist-key', 'persist-val');
    store.close();

    // Open direct connection with an exclusive transaction holding a write lock
    const { DatabaseSync } = await import('node:sqlite');
    const directDb = new DatabaseSync(cachePath);
    directDb.exec('BEGIN EXCLUSIVE TRANSACTION;');

    // Use a tiny busyTimeoutMs so the test fails fast instead of waiting 5s
    const lockedStore = new SqliteCacheStore(cachePath, undefined, undefined, 10);
    try {
      expect(lockedStore.has('persist-key')).toBeFalse();
      expect(await lockedStore.get('persist-key')).toBeUndefined();
    } finally {
      lockedStore.close();
      directDb.exec('COMMIT;');
      directDb.close();
    }

    // Verify the original database file and its data were not deleted
    const verifyStore = new SqliteCacheStore(cachePath);
    try {
      expect(await verifyStore.get('persist-key')).toBe('persist-val');
    } finally {
      verifyStore.close();
    }
  });

  it('should safely fall back to default timeout if invalid busyTimeoutMs is provided', async () => {
    // Pass NaN as busyTimeoutMs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invalidStore = new SqliteCacheStore(cachePath, undefined, undefined, NaN as any);
    try {
      await invalidStore.set('valid-key', 'valid-value');
      expect(await invalidStore.get('valid-key')).toBe('valid-value');
    } finally {
      invalidStore.close();
    }
  });

  it('should flush pending access updates on close', async () => {
    await store.set('flush-key', 'flush-val');

    // Manually backdate the entry's last_accessed timestamp to simulate elapsed time
    const { DatabaseSync } = await import('node:sqlite');
    const directDb = new DatabaseSync(cachePath);
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600;
    directDb
      .prepare('UPDATE cache SET last_accessed = ? WHERE key = ?')
      .run(pastTimestamp, 'flush-key');
    directDb.close();

    // Access the key via store.get() to queue an access update
    await store.get('flush-key');

    // Immediately close the store before the debounced 500ms timeout fires
    store.close();

    // Verify the timestamp in SQLite was updated upon close
    const checkDb = new DatabaseSync(cachePath);
    const row = checkDb
      .prepare('SELECT last_accessed FROM cache WHERE key = ?')
      .get('flush-key') as { last_accessed: number };
    checkDb.close();

    expect(row.last_accessed).toBeGreaterThan(pastTimestamp);
  });

  it('should treat a non-binary payload as a cache miss', async () => {
    await store.set('text-key', 'value');
    store.close();

    // SQLite column types are dynamic, so a stored value is not guaranteed to be binary.
    const { DatabaseSync } = await import('node:sqlite');
    const directDb = new DatabaseSync(cachePath);
    directDb.prepare('UPDATE cache SET value = ? WHERE key = ?').run('"value"', 'text-key');
    directDb.close();

    const reopenedStore = new SqliteCacheStore(cachePath);
    try {
      expect(await reopenedStore.get('text-key')).toBeUndefined();
    } finally {
      reopenedStore.close();
    }
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
    // Keys 'k1', 'k2', 'k3' are small (each is 12 bytes: 2 byte key + 10 byte serialized value).
    // Total size of k1 + k2 + k3 is 36 bytes, which exceeds the 25 bytes limit.
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

  it('should not prune items when total database size is within maxPayloadSize on close', async () => {
    store.close();

    const sizeStore = new SqliteCacheStore(cachePath, 1024 * 1024);
    await sizeStore.set('k1', 'value1');
    await sizeStore.set('k2', 'value2');
    sizeStore.close();

    const checkStore = new SqliteCacheStore(cachePath);
    expect(checkStore.has('k1')).toBeTrue();
    expect(checkStore.has('k2')).toBeTrue();
    checkStore.close();
  });

  it('should create an index on last_accessed and key', async () => {
    // Trigger db initialization
    await store.set('test-key', 'test-value');
    store.close();

    const { DatabaseSync } = await import('node:sqlite');
    const directDb = new DatabaseSync(cachePath);
    try {
      const indexRows = directDb
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'cache' AND name = 'idx_cache_accessed'",
        )
        .all();
      expect(indexRows.length).toBe(1);
    } finally {
      directDb.close();
    }
  });

  it('should create parent directories if they do not exist', async () => {
    const nestedDir = join(tempDir, 'nested', 'deeply', 'cache');
    const nestedCachePath = join(nestedDir, 'nested-cache.db');
    const nestedStore = new SqliteCacheStore(nestedCachePath);

    try {
      await nestedStore.set('nested-key', 'nested-value');
      const result = await nestedStore.get('nested-key');
      expect(result).toBe('nested-value');
    } finally {
      nestedStore.close();
    }
  });

  it('should support in-memory databases', async () => {
    const memoryStore = new SqliteCacheStore(':memory:');
    try {
      await memoryStore.set('mem-key', 'mem-value');
      const result = await memoryStore.get('mem-key');
      expect(result).toBe('mem-value');
    } finally {
      memoryStore.close();
    }
  });

  describe('NG_BUILD_CACHE_STORE env variable option', () => {
    it('should force SQLite when NG_BUILD_CACHE_STORE=sqlite', () => {
      const code = `
        (async () => {
          const { createPersistentCacheStore } = await import('./cache.js');
          const { SqliteCacheStore } = await import('./sqlite-cache-store.js');
          const store = await createPersistentCacheStore('dummy-sqlite-env');
          if (!(store instanceof SqliteCacheStore)) {
            console.error('Expected SqliteCacheStore, got:', store.constructor.name);
            process.exit(1);
          }
        })().catch(err => {
          console.error(err);
          process.exit(2);
        });
      `;
      const { execFileSync } = require('node:child_process');
      execFileSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: __dirname,
        env: {
          ...process.env,
          NG_BUILD_CACHE_STORE: 'sqlite',
        },
      });
    });

    it('should force LMDB when NG_BUILD_CACHE_STORE=lmdb', () => {
      const code = `
        (async () => {
          const { createPersistentCacheStore } = await import('./cache.js');
          const { LmdbCacheStore } = await import('./lmdb-cache-store.js');
          const store = await createPersistentCacheStore('dummy-lmdb-env');
          if (!(store instanceof LmdbCacheStore)) {
            console.error('Expected LmdbCacheStore, got:', store.constructor.name);
            process.exit(1);
          }
        })().catch(err => {
          console.error(err);
          process.exit(2);
        });
      `;
      const { execFileSync } = require('node:child_process');
      try {
        execFileSync(process.execPath, ['--input-type=module', '-e', code], {
          cwd: __dirname,
          env: {
            ...process.env,
            NG_BUILD_CACHE_STORE: 'lmdb',
          },
        });
      } catch (e) {
        if (e && typeof e === 'object' && 'message' in e) {
          const error = e as { message: string; stderr?: Buffer };
          const output = error.stderr?.toString() || error.message;
          if (!output.includes('Unable to initialize JavaScript cache storage')) {
            throw e;
          }
        } else {
          throw e;
        }
      }
    });
  });
});
