/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createHash } from 'crypto';
import * as fs from 'fs';
import { copyFile } from './copy-file';
import { allowMangle } from './environment-options';
import { CacheKey, ProcessBundleOptions, ProcessBundleResult } from './process-bundle';

const cacache = require('cacache');
const packageVersion = require('../../package.json').version;

export interface CacheEntry {
  path: string;
  size: number;
  integrity?: string;
}

export class BundleActionCache {
  constructor(private readonly cachePath: string, private readonly integrityAlgorithm?: string) {}

  static copyEntryContent(entry: CacheEntry | string, dest: fs.PathLike): void {
    copyFile(typeof entry === 'string' ? entry : entry.path, dest);

    if (process.platform !== 'win32') {
      // The cache writes entries as readonly and when using copyFile the permissions will also be copied.
      // See: https://github.com/npm/cacache/blob/073fbe1a9f789ba42d9a41de7b8429c93cf61579/lib/util/move-file.js#L36
      fs.chmodSync(dest, 0o644);
    }
  }

  generateBaseCacheKey(content: string): string {
    // Create base cache key with elements:
    // * package version - different build-angular versions cause different final outputs
    // * code length/hash - ensure cached version matches the same input code
    const algorithm = this.integrityAlgorithm || 'sha1';
    const codeHash = createHash(algorithm)
      .update(content)
      .digest('base64');
    let baseCacheKey = `${packageVersion}|${content.length}|${algorithm}-${codeHash}`;
    if (!allowMangle) {
      baseCacheKey += '|MD';
    }

    return baseCacheKey;
  }

  generateCacheKeys(action: ProcessBundleOptions): string[] {
    // Postfix added to sourcemap cache keys when vendor, hidden sourcemaps are present
    // Allows non-destructive caching of both variants
    const sourceMapVendorPostfix = action.sourceMaps && action.vendorSourceMaps ? '|vendor' : '';

    // sourceMappingURL is added at the very end which causes the code to be the same when sourcemaps are enabled/disabled
    // When using hiddenSourceMaps we can omit the postfix since sourceMappingURL will not be added.
    // When having sourcemaps a hashed file and non hashed file can have the same content. But the sourceMappingURL will differ.
    const sourceMapPostFix = action.sourceMaps && !action.hiddenSourceMaps ? `|sourcemap|${action.filename}` : '';

    const baseCacheKey = this.generateBaseCacheKey(action.code);

    // Determine cache entries required based on build settings
    const cacheKeys: string[] = [];

    // If optimizing and the original is not ignored, add original as required
    if (!action.ignoreOriginal) {
      cacheKeys[CacheKey.OriginalCode] = baseCacheKey + sourceMapPostFix + '|orig';

      // If sourcemaps are enabled, add original sourcemap as required
      if (action.sourceMaps) {
        cacheKeys[CacheKey.OriginalMap] = baseCacheKey + sourceMapVendorPostfix + '|orig-map';
      }
    }

    // If not only optimizing, add downlevel as required
    if (!action.optimizeOnly) {
      cacheKeys[CacheKey.DownlevelCode] = baseCacheKey + sourceMapPostFix + '|dl';

      // If sourcemaps are enabled, add downlevel sourcemap as required
      if (action.sourceMaps) {
        cacheKeys[CacheKey.DownlevelMap] = baseCacheKey + sourceMapVendorPostfix + '|dl-map';
      }
    }

    return cacheKeys;
  }

  async getCacheEntries(cacheKeys: (string | undefined)[]): Promise<(CacheEntry | null)[] | false> {
    // Attempt to get required cache entries
    const cacheEntries = [];
    for (const key of cacheKeys) {
      if (key) {
        const entry = await cacache.get.info(this.cachePath, key);
        if (!entry) {
          return false;
        }
        cacheEntries.push({
          path: entry.path,
          size: entry.size,
          integrity: entry.metadata && entry.metadata.integrity,
        });
      } else {
        cacheEntries.push(null);
      }
    }

    return cacheEntries;
  }

  async getCachedBundleResult(action: ProcessBundleOptions): Promise<ProcessBundleResult | null> {
    const entries = action.cacheKeys && await this.getCacheEntries(action.cacheKeys);
    if (!entries) {
      return null;
    }

    const result: ProcessBundleResult = { name: action.name };

    let cacheEntry = entries[CacheKey.OriginalCode];
    if (cacheEntry) {
      result.original = {
        filename: action.filename,
        size: cacheEntry.size,
        integrity: cacheEntry.integrity,
      };

      BundleActionCache.copyEntryContent(cacheEntry, result.original.filename);

      cacheEntry = entries[CacheKey.OriginalMap];
      if (cacheEntry) {
        result.original.map = {
          filename: action.filename + '.map',
          size: cacheEntry.size,
        };

        BundleActionCache.copyEntryContent(cacheEntry, result.original.filename + '.map');
      }
    } else if (!action.ignoreOriginal) {
      // If the original wasn't processed (and therefore not cached), add info
      result.original = {
        filename: action.filename,
        size: Buffer.byteLength(action.code, 'utf8'),
        map:
          action.map === undefined
            ? undefined
            : {
                filename: action.filename + '.map',
                size: Buffer.byteLength(action.map, 'utf8'),
              },
      };
    }

    cacheEntry = entries[CacheKey.DownlevelCode];
    if (cacheEntry) {
      result.downlevel = {
        filename: action.filename.replace(/\-(es20\d{2}|esnext)/, '-es5'),
        size: cacheEntry.size,
        integrity: cacheEntry.integrity,
      };

      BundleActionCache.copyEntryContent(cacheEntry, result.downlevel.filename);

      cacheEntry = entries[CacheKey.DownlevelMap];
      if (cacheEntry) {
        result.downlevel.map = {
          filename: action.filename.replace(/\-(es20\d{2}|esnext)/, '-es5') + '.map',
          size: cacheEntry.size,
        };

        BundleActionCache.copyEntryContent(cacheEntry, result.downlevel.filename + '.map');
      }
    }

    return result;
  }
}
