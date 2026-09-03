/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, StatementSync } from 'node:sqlite';
import { deserialize, serialize } from 'node:v8';
import { Cache, PersistentCacheStore } from './cache';

/**
 * A persistent cache store backed by SQLite.
 *
 * Values are persisted with the V8 structured clone serialization API instead of JSON. Cached
 * values include binary data such as the `Uint8Array` output of the JavaScript transformer and
 * the `contents` of an esbuild load result. A JSON round-trip converts those into plain objects
 * (`{"0":105,"1":109,...}`), which breaks consumers on any build that reads them back from disk.
 */
export class SqliteCacheStore implements PersistentCacheStore<unknown> {
  #db: DatabaseSync | undefined;
  #getStmt: StatementSync | undefined;
  #hasStmt: StatementSync | undefined;
  #setStmt: StatementSync | undefined;
  #updateAccessedStmt: StatementSync | undefined;
  readonly #pendingAccessedKeys = new Set<string>();
  #flushTimeout: NodeJS.Timeout | undefined;

  constructor(
    readonly cachePath: string,
    private readonly maxPayloadSize = 1024 * 1024 * 1024,
    private readonly ttlDays = 14,
  ) {}

  #ensureDb(): DatabaseSync {
    if (!this.#db) {
      if (this.cachePath === ':memory:') {
        this.#db = new DatabaseSync(this.cachePath);
      } else {
        // Optimistically attempt to open the database file first to avoid directory creation
        // syscalls on warm builds where the parent directory already exists.
        try {
          this.#db = new DatabaseSync(this.cachePath);
        } catch {
          mkdirSync(dirname(this.cachePath), { recursive: true });
          this.#db = new DatabaseSync(this.cachePath);
        }
      }

      // Optimize SQLite for cache usage
      this.#db.exec('PRAGMA auto_vacuum = FULL;');
      this.#db.exec('PRAGMA journal_mode = WAL;');
      this.#db.exec('PRAGMA synchronous = NORMAL;');
      this.#db.exec('PRAGMA busy_timeout = 5000;');
      this.#db.exec('PRAGMA temp_store = MEMORY;');
      this.#db.exec('PRAGMA mmap_size = 268435456;');
      this.#db.exec(
        'CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value BLOB, last_accessed INTEGER NOT NULL) WITHOUT ROWID;',
      );
      this.#db.exec(
        'CREATE INDEX IF NOT EXISTS idx_cache_accessed ON cache (last_accessed DESC, key DESC);',
      );

      this.#getStmt = this.#db.prepare('SELECT value FROM cache WHERE key = ?');
      this.#hasStmt = this.#db.prepare('SELECT 1 FROM cache WHERE key = ?');
      this.#setStmt = this.#db.prepare(
        'INSERT OR REPLACE INTO cache (key, value, last_accessed) VALUES (?, ?, unixepoch())',
      );
      this.#updateAccessedStmt = this.#db.prepare(
        'UPDATE cache SET last_accessed = unixepoch() WHERE key = ?',
      );
    }

    return this.#db;
  }

  #queueAccessUpdate(key: string): void {
    this.#pendingAccessedKeys.add(key);

    if (this.#pendingAccessedKeys.size >= 100) {
      this.#flushAccessUpdates();
    } else if (!this.#flushTimeout) {
      this.#flushTimeout = setTimeout(() => this.#flushAccessUpdates(), 500);
      this.#flushTimeout.unref?.();
    }
  }

  #flushAccessUpdates(): void {
    if (this.#flushTimeout) {
      clearTimeout(this.#flushTimeout);
      this.#flushTimeout = undefined;
    }

    if (!this.#db || this.#pendingAccessedKeys.size === 0 || !this.#updateAccessedStmt) {
      return;
    }

    try {
      this.#db.exec('BEGIN IMMEDIATE TRANSACTION;');
      for (const key of this.#pendingAccessedKeys) {
        this.#updateAccessedStmt.run(key);
      }
      this.#db.exec('COMMIT;');
    } catch {
      try {
        this.#db.exec('ROLLBACK;');
      } catch {
        // Ignore rollback errors if transaction was not active
      }
    } finally {
      this.#pendingAccessedKeys.clear();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(key: string): Promise<any> {
    this.#ensureDb();
    // SQLite column types are dynamic, so the stored value is only known at runtime.
    const row = this.#getStmt?.get(key) as { value: unknown } | undefined;

    if (row) {
      this.#queueAccessUpdate(key);

      if (row.value instanceof Uint8Array) {
        try {
          return deserialize(row.value);
        } catch {
          // Treat corrupt or unparseable cached payloads as a cache miss.
        }
      }
    }

    return undefined;
  }

  has(key: string): boolean {
    this.#ensureDb();

    return !!this.#hasStmt?.get(key);
  }

  async set(key: string, value: unknown): Promise<this> {
    this.#ensureDb();
    this.#pendingAccessedKeys.delete(key);
    this.#setStmt?.run(key, serialize(value));

    return this;
  }

  createCache<V = unknown>(namespace: string): Cache<V> {
    return new Cache(this, namespace);
  }

  close(): void {
    if (this.#db) {
      try {
        // Flush any pending access updates in one transaction before pruning
        this.#flushAccessUpdates();

        this.#db.exec('BEGIN IMMEDIATE TRANSACTION;');
        try {
          // 1. Delete items older than N days
          this.#db
            .prepare("DELETE FROM cache WHERE last_accessed < unixepoch('now', ?);")
            .run(`-${this.ttlDays} days`);

          // 2. Prune oldest items if payload exceeds maxPayloadSize
          // Skip the expensive window aggregate query if total database size is below maxPayloadSize
          const sizeResult = this.#db
            .prepare(
              'SELECT (page_count - freelist_count) * page_size AS total_size ' +
                'FROM pragma_page_count(), pragma_freelist_count(), pragma_page_size();',
            )
            .get() as { total_size?: number } | undefined;

          if ((sizeResult?.total_size ?? 0) > this.maxPayloadSize) {
            this.#db
              .prepare(
                `DELETE FROM cache WHERE key IN (
                  SELECT key FROM (
                    SELECT key,
                           sum(length(key) + length(value)) OVER (ORDER BY last_accessed DESC, key DESC) as running_size
                    FROM cache
                  ) WHERE running_size > ?
                );`,
              )
              .run(this.maxPayloadSize);
          }

          this.#db.exec('COMMIT;');
        } catch (error) {
          try {
            this.#db.exec('ROLLBACK;');
          } catch {
            // Ignore rollback errors if transaction was not active
          }
          throw error;
        }
      } catch {
        // Pruning errors should not block build success
      } finally {
        if (this.#flushTimeout) {
          clearTimeout(this.#flushTimeout);
          this.#flushTimeout = undefined;
        }
        this.#pendingAccessedKeys.clear();

        this.#getStmt = undefined;
        this.#hasStmt = undefined;
        this.#setStmt = undefined;
        this.#updateAccessedStmt = undefined;

        try {
          this.#db.close();
        } catch {
          // Failure to close should not block build success
        }
        this.#db = undefined;
      }
    }
  }
}
