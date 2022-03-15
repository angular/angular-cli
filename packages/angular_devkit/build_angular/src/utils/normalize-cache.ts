/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json } from '@angular-devkit/core';
import { join, resolve } from 'path';
import { VERSION } from './package-version';

export interface NormalizedCachedOptions {
  /** Whether disk cache is enabled. */
  enabled: boolean;
  /** Disk cache path. Example: `/.angular/cache/v12.0.0`. */
  path: string;
  /** Disk cache base path. Example: `/.angular/cache`. */
  basePath: string;
}

interface CacheMetadata {
  enabled?: boolean;
  environment?: 'local' | 'ci' | 'all';
  path?: string;
}

export function normalizeCacheOptions(
  metadata: json.JsonObject,
  worspaceRoot: string,
): NormalizedCachedOptions {
  const cacheMetadata: CacheMetadata =
    json.isJsonObject(metadata.cli) && json.isJsonObject(metadata.cli.cache)
      ? metadata.cli.cache
      : {};

  const { enabled = true, environment = 'local', path = '.angular/cache' } = cacheMetadata;
  const isCI = process.env['CI'] === '1' || process.env['CI']?.toLowerCase() === 'true';

  let cacheEnabled = enabled;
  if (cacheEnabled) {
    switch (environment) {
      case 'ci':
        cacheEnabled = isCI;
        break;
      case 'local':
        cacheEnabled = !isCI;
        break;
    }
  }

  const cacheBasePath = resolve(worspaceRoot, path);

  return {
    enabled: cacheEnabled,
    basePath: cacheBasePath,
    path: join(cacheBasePath, VERSION),
  };
}
