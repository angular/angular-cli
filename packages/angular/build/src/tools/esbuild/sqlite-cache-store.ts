/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { DatabaseSync, StatementSync } from 'node:sqlite';
import { deserialize, serialize } from 'node:v8';
import { Cache, type CacheStore } from './cache';

export class SqliteCacheStore implements CacheStore<unknown> {
  #db: DatabaseSync | undefined;
  #getStatement: StatementSync | undefined;
  #hasStatement: StatementSync | undefined;
  #setStatement: StatementSync | undefined;

  constructor(readonly cachePath: string) {}

  #ensureDb(): void {
    if (this.#db) {
      return;
    }

    const db = new DatabaseSync(this.cachePath);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value BLOB
      );
    `);

    this.#getStatement = db.prepare('SELECT value FROM cache WHERE key = ?');
    this.#hasStatement = db.prepare('SELECT 1 FROM cache WHERE key = ?');
    this.#setStatement = db.prepare('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)');

    this.#db = db;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(key: string): Promise<any> {
    this.#ensureDb();

    assert(this.#getStatement, 'getStatement should be initialized by ensureDb');

    const result = this.#getStatement.get(key) as { value: Uint8Array } | undefined;
    if (result) {
      return deserialize(result.value);
    }

    return undefined;
  }

  has(key: string): boolean {
    this.#ensureDb();

    assert(this.#hasStatement, 'hasStatement should be initialized by ensureDb');

    const result = this.#hasStatement.get(key);

    return result !== undefined;
  }

  async set(key: string, value: unknown): Promise<this> {
    this.#ensureDb();

    assert(this.#setStatement, 'setStatement should be initialized by ensureDb');

    this.#setStatement.run(key, serialize(value));

    return this;
  }

  createCache<V = unknown>(namespace: string): Cache<V> {
    return new Cache(this, namespace);
  }

  async close() {
    try {
      this.#db?.close();
    } catch {
      // Failure to close should not be fatal
    }
  }
}
