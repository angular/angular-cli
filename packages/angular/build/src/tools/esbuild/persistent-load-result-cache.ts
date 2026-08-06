/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * Implements a generic, two-tier (L1 memory + L2 persistent disk store) caching system for
 * esbuild plugin `OnLoadResult` outcomes across the `@angular/build` compiler pipeline.
 *
 * Supported Module Types:
 * 1. **Disk File Modules** (`file:` namespace): Standard disk-based source files (TS, JS, CSS, Sass, Less).
 *    Cache keys are computed using the root `globalConfigHash`, file path, and file content. Validity is
 *    verified via fast-path metadata (`mtimeMs` + `size`) with fallback to content hashing (`sha256`).
 * 2. **Custom Plugin Namespace Modules** (e.g. `angular:script/global`, `sass:`): Modules loaded through
 *    custom esbuild namespaces that resolve to disk source files.
 * 3. **Virtual Modules & Remote Resources** (e.g. `angular:styles/component`, `css-inline-fonts`): Synthetic
 *    in-memory modules or remote asset declarations whose compiled outcomes depend on parent source file
 *    dependencies (`watchFiles`) or global configuration options (`globalConfigHash`).
 *
 * Key Exported Types:
 * - {@link PersistentLoadResultCache}: Primary two-tier cache manager implementing `LoadResultCache`.
 * - {@link CachedLoadResultEntry}: Serialized structure persisted to disk for cached esbuild `OnLoadResult` items.
 * - {@link CachedDependencyMetadata}: Per-dependency file metadata (`hash`, `mtimeMs`, `size`) used for cache validation and healing.
 */

import type { Loader, OnLoadResult, PartialMessage } from 'esbuild';
import { readFile, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateHash, createContentHash } from '../../utils/hash';
import type { Cache as PersistentCacheStore } from './cache';
import { LoadResultCache, MemoryLoadResultCache } from './load-result-cache';

/**
 * Metadata for a single watch file dependency.
 */
export interface CachedDependencyMetadata {
  hash: string;
  mtimeMs: number;
  size: number;
}

/**
 * Serialized representation of any esbuild load result stored in persistent cache.
 */
export interface CachedLoadResultEntry {
  /** Compiled output string or binary data */
  contents: string | Uint8Array;

  /** esbuild loader type */
  loader?: Loader;

  /** Absolute paths of all imported/watched dependency files */
  watchFiles: string[];

  /** Absolute paths of all watched directories */
  watchDirs?: string[];

  /** Map of watchFile absolute paths to dependency metadata */
  watchFilesMetadata: Record<string, CachedDependencyMetadata>;

  /** Warnings emitted during load processing */
  warnings?: PartialMessage[];

  /** Errors emitted during load processing */
  errors?: PartialMessage[];
}

/**
 * Calculates a unique cache key by updating the hash incrementally.
 * This prevents implicit string coercion of large binary content buffers.
 */
function calculateCacheKey(
  globalConfigHash: string,
  path: string,
  content: string | Uint8Array,
): string {
  const hasher = createContentHash();
  hasher.update(globalConfigHash);
  hasher.update('\0');
  hasher.update(path);
  hasher.update('\0');
  hasher.update(content);

  return hasher.digest();
}

/**
 * Normalizes a namespaced cache key into a valid disk file path if one exists.
 * Handles 'file:' URIs, OS platform differences, and custom plugin namespaces.
 */
export function extractDiskFilePath(path: string): string | undefined {
  if (path.startsWith('file:')) {
    const urlStr = path.startsWith('file://') ? path : 'file://' + path.slice(5);
    try {
      return fileURLToPath(urlStr);
    } catch {
      const candidate = path.slice(5);

      return isAbsolute(candidate) ? candidate : undefined;
    }
  }

  // Handle custom namespace prefix (e.g. "sass:/path/to/file")
  // Ensure colonIndex > 1 to avoid treating Windows drive letters (e.g. "C:/") as namespace prefixes.
  const colonIndex = path.indexOf(':');
  if (colonIndex > 1) {
    const candidatePath = path.slice(colonIndex + 1);
    if (isAbsolute(candidatePath)) {
      return candidatePath;
    }
  }

  return isAbsolute(path) ? path : undefined;
}

/** Maximum number of concurrent file system read/stat operations to prevent OS file descriptor exhaustion. */
const MAX_CONCURRENT_READS = 16;

/**
 * Maps an array asynchronously with a sliding worker pool to maintain full concurrency saturation.
 */
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  });

  await Promise.all(workers);

  return results;
}

/**
 * Validates that all imported watch files exist on disk and their contents match.
 * Performs a fast-path metadata check (mtime + size) first, falling back to content hashing.
 * Heals/updates the cached metadata on disk if the content hash was valid but the metadata changed.
 */
async function validateAndHealCacheEntry(
  watchFilesMetadata: Record<string, CachedDependencyMetadata> | undefined,
  store: PersistentCacheStore<CachedLoadResultEntry>,
  cacheKey: string,
  cached: CachedLoadResultEntry,
  targetFilePath?: string,
): Promise<boolean> {
  if (!watchFilesMetadata) {
    return false;
  }

  const watchFiles = Object.keys(watchFilesMetadata);
  let healed = false;

  const isValidResults = await mapConcurrent(watchFiles, MAX_CONCURRENT_READS, async (filePath) => {
    try {
      const stats = await stat(filePath);
      const expected = watchFilesMetadata[filePath];
      if (!expected) {
        return false;
      }

      // 1. Fast Path: size and mtime match
      if (stats.size === expected.size && stats.mtimeMs === expected.mtimeMs) {
        return true;
      }

      // 2. Target File Path: content hash was already verified by cacheKey lookup, heal metadata if mtime changed
      if (targetFilePath && filePath === targetFilePath) {
        watchFilesMetadata[filePath] = {
          ...expected,
          mtimeMs: stats.mtimeMs,
          size: stats.size,
        };
        healed = true;

        return true;
      }

      // 3. Slow Path for dependencies: content hash fallback
      const currentContent = await readFile(filePath);
      const currentHash = calculateHash(currentContent);
      if (currentHash === expected.hash) {
        // Heal cache entry with new metadata
        watchFilesMetadata[filePath] = {
          ...expected,
          mtimeMs: stats.mtimeMs,
          size: stats.size,
        };
        healed = true;

        return true;
      }

      return false;
    } catch {
      return false;
    }
  });

  if (isValidResults.some((isValid) => !isValid)) {
    return false;
  }

  if (healed) {
    try {
      await store.put(cacheKey, cached);
    } catch {
      // Ignore errors writing healed entries
    }
  }

  return true;
}

/**
 * Computes metadata (content hashes, mtime, size) for an array of watch file paths.
 * Processes files with a sliding worker pool of 16 concurrent operations.
 */
async function computeMetadataForWatchFiles(
  watchFiles: string[],
  knownContents?: Map<string, string | Uint8Array>,
): Promise<Record<string, CachedDependencyMetadata>> {
  const watchFilesMetadata: Record<string, CachedDependencyMetadata> = {};

  await mapConcurrent(watchFiles, MAX_CONCURRENT_READS, async (filePath) => {
    try {
      const knownContent = knownContents?.get(filePath);
      const [content, stats] = await Promise.all([
        knownContent !== undefined ? knownContent : readFile(filePath),
        stat(filePath),
      ]);
      const hash = calculateHash(content);
      watchFilesMetadata[filePath] = {
        hash,
        mtimeMs: stats.mtimeMs,
        size: stats.size,
      };
    } catch {
      // Ignore unreadable files
    }
  });

  return watchFilesMetadata;
}

export class PersistentLoadResultCache implements LoadResultCache {
  private readonly memoryCache = new MemoryLoadResultCache();

  constructor(
    private readonly persistentStore?: PersistentCacheStore<CachedLoadResultEntry>,
    private readonly globalConfigHash: string = '',
  ) {}

  /**
   * Retrieves a load result from cache.
   * Checks L1 memory cache first for immediate watch-mode speed, falling back to L2 persistent disk
   * store on L1 cache miss. L2 persistent cache entries are validated against dependency metadata.
   */
  async get(path: string): Promise<OnLoadResult | undefined> {
    // 1. Check L1 Memory Cache
    const memoryResult = this.memoryCache.get(path);
    if (memoryResult) {
      return memoryResult;
    }

    if (!this.persistentStore) {
      return undefined;
    }

    // 2. Check L2 Persistent Disk Cache
    let content: string | Uint8Array = '';
    const filePath = extractDiskFilePath(path);
    if (filePath) {
      try {
        content = await readFile(filePath);
      } catch {
        return undefined;
      }
    }

    const cacheKey = calculateCacheKey(this.globalConfigHash, path, content);
    const cached = await this.persistentStore.get(cacheKey);

    if (
      cached &&
      (await validateAndHealCacheEntry(
        cached.watchFilesMetadata,
        this.persistentStore,
        cacheKey,
        cached,
        filePath,
      ))
    ) {
      const result: OnLoadResult = {
        contents: cached.contents,
        loader: cached.loader,
        watchFiles: cached.watchFiles,
        watchDirs: cached.watchDirs,
        warnings: cached.warnings,
        errors: cached.errors,
      };

      // Populate L1 Memory Cache for subsequent lookups
      await this.memoryCache.put(path, result);

      return result;
    }

    return undefined;
  }

  /**
   * Stores a load result in both L1 memory cache and L2 persistent disk store.
   */
  async put(path: string, result: OnLoadResult): Promise<void> {
    await this.memoryCache.put(path, result);

    // Persist to L2 store if persistentStore is configured and contents exist (including empty strings/buffers)
    if (this.persistentStore && result.contents !== undefined) {
      let content: string | Uint8Array = '';
      const filePath = extractDiskFilePath(path);
      if (filePath) {
        try {
          content = await readFile(filePath);
        } catch {
          // Skip L2 persistent store if target disk file cannot be read
          return;
        }
      }

      const cacheKey = calculateCacheKey(this.globalConfigHash, path, content);

      // Reuse the target file's pre-read content buffer to avoid redundant disk reads (readFile)
      // during dependency watch file metadata computation.
      const knownContents = filePath
        ? new Map<string, string | Uint8Array>([[filePath, content]])
        : undefined;
      const watchFilesMetadata = await computeMetadataForWatchFiles(
        result.watchFiles ?? [],
        knownContents,
      );

      await this.persistentStore.put(cacheKey, {
        contents: result.contents,
        loader: result.loader,
        watchFiles: result.watchFiles ?? [],
        watchDirs: result.watchDirs,
        watchFilesMetadata,
        warnings: result.warnings,
        errors: result.errors,
      });
    }
  }

  /**
   * Invalidates cached entries affected by a modified dependency file during watch mode.
   *
   * Note: Invalidation of L1 memory cache is sufficient for active watch mode.
   * Cross-process/cold start stale entries in L2 persistent store are automatically handled
   * during `get()` via dependency metadata verification (`validateAndHealCacheEntry`).
   */
  invalidate(path: string): boolean {
    return this.memoryCache.invalidate(path);
  }

  get watchFiles(): ReadonlyArray<string> {
    return this.memoryCache.watchFiles;
  }
}
