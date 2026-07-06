/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

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

function getCacheBasePath(workspaceRoot: string, cachePathSetting: string): string {
  if (isAbsolute(cachePathSetting)) {
    return cachePathSetting;
  }

  try {
    // Find the git directory, walking up from workspaceRoot if necessary
    let currentDir = workspaceRoot;
    while (true) {
      const gitPath = join(currentDir, '.git');
      if (existsSync(gitPath)) {
        const stat = statSync(gitPath);
        if (stat.isFile()) {
          // Could be a git worktree (or submodule)
          const content = readFileSync(gitPath, 'utf8');
          const match = /^gitdir:\s*(.+)$/m.exec(content);
          if (match) {
            const gitdir = resolve(currentDir, match[1].trim());
            const commondirPath = join(gitdir, 'commondir');
            if (existsSync(commondirPath)) {
              // It's a git worktree
              const commondir = readFileSync(commondirPath, 'utf8').trim();
              const commonGitDir = resolve(gitdir, commondir);

              return resolve(dirname(commonGitDir), cachePathSetting);
            }
          }
        }
      }
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  } catch {}

  return resolve(workspaceRoot, cachePathSetting);
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

  const cacheBasePath = getCacheBasePath(worspaceRoot, path);

  return {
    enabled: cacheEnabled,
    basePath: cacheBasePath,
    path: join(cacheBasePath, VERSION),
  };
}
