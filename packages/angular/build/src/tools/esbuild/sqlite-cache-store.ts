/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, StatementSync } from 'node:sqlite';
import { deserialize, serialize } from 'node:v8';
import { Cache, PersistentCacheStore } from './cache';

/**
 * Common SQLite primary result codes.
 * @see https://www.sqlite.org/rescode.html
 */
const enum SqliteResultCode {
  Busy = 5,
  Locked = 6,
}

interface SqliteError extends Error {
  code?: string;
  errcode?: number;
  errstr?: string;
}

function isSqliteError(error: unknown): error is SqliteError {
  return (
    error instanceof Error &&
    ('errcode' in error ||
      ('code' in error && (error as { code: unknown }).code === 'ERR_SQLITE_ERROR'))
  );
}

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
  #disabled = false;
  #getStmt: StatementSync | undefined;
  #hasStmt: StatementSync | undefined;
  #setStmt: StatementSync | undefined;
  #updateAccessedStmt: StatementSync | undefined;
  readonly #pendingAccessedKeys = new Set<string>();
  #flushTimeout: NodeJS.Timeout | undefined;
  readonly #busyTimeoutMs: number;

  constructor(
    readonly cachePath: string,
    private readonly maxPayloadSize = 1024 * 1024 * 1024,
    private readonly ttlDays = 14,
    busyTimeoutMs = 5000,
  ) {
    this.#busyTimeoutMs =
      Number.isSafeInteger(busyTimeoutMs) && busyTimeoutMs >= 0 ? busyTimeoutMs : 5000;
  }

  #openDatabase(): DatabaseSync {
    let db: DatabaseSync | undefined;
    try {
      if (this.cachePath === ':memory:') {
        db = new DatabaseSync(this.cachePath);
      } else {
        // Optimistically attempt to open the database file first to avoid directory creation
        // syscalls on warm builds where the parent directory already exists.
        try {
          db = new DatabaseSync(this.cachePath);
        } catch {
          mkdirSync(dirname(this.cachePath), { recursive: true });
          db = new DatabaseSync(this.cachePath);
        }
      }

      // Optimize SQLite for cache usage
      db.exec(`PRAGMA busy_timeout = ${this.#busyTimeoutMs};`);
      db.exec('PRAGMA auto_vacuum = FULL;');
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA synchronous = NORMAL;');
      db.exec('PRAGMA temp_store = MEMORY;');
      db.exec('PRAGMA mmap_size = 268435456;');
      db.exec(
        'CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value BLOB, last_accessed INTEGER NOT NULL) WITHOUT ROWID;',
      );
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_cache_accessed ON cache (last_accessed DESC, key DESC);',
      );

      this.#getStmt = db.prepare('SELECT value FROM cache WHERE key = ?');
      this.#hasStmt = db.prepare('SELECT 1 FROM cache WHERE key = ?');
      this.#setStmt = db.prepare(
        'INSERT OR REPLACE INTO cache (key, value, last_accessed) VALUES (?, ?, unixepoch())',
      );
      this.#updateAccessedStmt = db.prepare(
        'UPDATE cache SET last_accessed = unixepoch() WHERE key = ?',
      );

      this.#db = db;

      return db;
    } catch (error) {
      try {
        db?.close();
      } catch {
        // Ignore close error on corrupted handle
      }
      this.#getStmt = undefined;
      this.#hasStmt = undefined;
      this.#setStmt = undefined;
      this.#updateAccessedStmt = undefined;
      throw error;
    }
  }

  #ensureDb(): DatabaseSync | undefined {
    if (this.#disabled) {
      return undefined;
    }

    if (!this.#db) {
      try {
        return this.#openDatabase();
      } catch (error) {
        // If the database is locked by another active process,
        // do not attempt to delete the database files as that could corrupt the active process's database.
        const isBusy =
          isSqliteError(error) &&
          (error.errcode === SqliteResultCode.Busy || error.errcode === SqliteResultCode.Locked);

        // Attempt to recover from database corruption by deleting the corrupted files and recreating
        if (!isBusy && this.cachePath !== ':memory:') {
          try {
            rmSync(this.cachePath, { force: true });
            rmSync(this.cachePath + '-wal', { force: true });
            rmSync(this.cachePath + '-shm', { force: true });
            rmSync(this.cachePath + '-journal', { force: true });

            return this.#openDatabase();
          } catch {
            // If recovery fails (e.g. read-only filesystem or permission denied), disable caching
          }
        }

        this.#disabled = true;

        return undefined;
      }
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

    if (this.#pendingAccessedKeys.size === 0) {
      return;
    }

    try {
      if (this.#db && this.#updateAccessedStmt) {
        this.#db.exec('BEGIN IMMEDIATE TRANSACTION;');
        for (const key of this.#pendingAccessedKeys) {
          this.#updateAccessedStmt.run(key);
        }
        this.#db.exec('COMMIT;');
      }
    } catch {
      try {
        this.#db?.exec('ROLLBACK;');
      } catch {
        // Ignore rollback errors if transaction was not active
      }
    } finally {
      this.#pendingAccessedKeys.clear();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(key: string): Promise<any> {
    if (!this.#ensureDb()) {
      return undefined;
    }

    try {
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
    } catch {
      // Treat query errors (e.g. disk read failures) as a cache miss.
    }

    return undefined;
  }

  has(key: string): boolean {
    if (!this.#ensureDb()) {
      return false;
    }

    try {
      return !!this.#hasStmt?.get(key);
    } catch {
      return false;
    }
  }

  async set(key: string, value: unknown): Promise<this> {
    if (!this.#ensureDb()) {
      return this;
    }

    try {
      this.#pendingAccessedKeys.delete(key);
      this.#setStmt?.run(key, serialize(value));
    } catch {
      // Writing to cache is non-fatal and should not fail the build.
    }

    return this;
  }

  createCache<V = unknown>(namespace: string): Cache<V> {
    return new Cache(this, namespace);
  }

  close(): void {
    this.#flushAccessUpdates();

    if (this.#db) {
      try {
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

    this.#disabled = false;
  }
}
