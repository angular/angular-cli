/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json } from '@angular-devkit/core';
import { resolve } from 'path';
import { cachingDisabled } from './environment-options';

export interface NormalizedCachedOptions {
  enabled: boolean;
  path: string;
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
  if (cachingDisabled !== null) {
    cacheEnabled = !cachingDisabled;
  }

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

  return {
    enabled: cacheEnabled,
    path: resolve(worspaceRoot, path),
  };
}
