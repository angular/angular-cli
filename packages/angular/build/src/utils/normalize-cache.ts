/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join, resolve } from 'node:path';

/** Version placeholder is replaced during the build process with actual package version */
const VERSION = '0.0.0-PLACEHOLDER';

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

function hasCacheMetadata(value: unknown): value is { cli: { cache: CacheMetadata } } {
  return (
    !!value &&
    typeof value === 'object' &&
    'cli' in value &&
    !!value['cli'] &&
    typeof value['cli'] === 'object' &&
    'cache' in value['cli']
  );
}

export function normalizeCacheOptions(
  projectMetadata: unknown,
  worspaceRoot: string,
): NormalizedCachedOptions {
  const cacheMetadata = hasCacheMetadata(projectMetadata) ? projectMetadata.cli.cache : {};

  const {
    // Webcontainers do not currently benefit from persistent disk caching and can lead to increased browser memory usage
    enabled = !process.versions.webcontainer,
    environment = 'local',
    path = '.angular/cache',
  } = cacheMetadata;
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
