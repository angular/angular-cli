/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isJsonObject } from '@angular-devkit/core';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { Cache, Environment } from '../../../lib/config/workspace-schema';
import { AngularWorkspace } from '../../utilities/config';

export function updateCacheConfig<K extends keyof Cache>(
  workspace: AngularWorkspace,
  key: K,
  value: Cache[K],
): Promise<void> {
  const cli = (workspace.extensions['cli'] ??= {}) as Record<string, Record<string, unknown>>;
  const cache = (cli['cache'] ??= {});
  cache[key] = value;

  return workspace.save();
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

export function getCacheConfig(workspace: AngularWorkspace | undefined): Required<Cache> {
  if (!workspace) {
    throw new Error(`Cannot retrieve cache configuration as workspace is not defined.`);
  }

  const defaultSettings: Required<Cache> = {
    path: getCacheBasePath(workspace.basePath, '.angular/cache'),
    environment: Environment.Local,
    enabled: true,
  };

  const cliSetting = workspace.extensions['cli'];
  if (!cliSetting || !isJsonObject(cliSetting)) {
    return defaultSettings;
  }

  const cacheSettings = cliSetting['cache'];
  if (!isJsonObject(cacheSettings)) {
    return defaultSettings;
  }

  const {
    path = '.angular/cache',
    environment = defaultSettings.environment,
    enabled = defaultSettings.enabled,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = cacheSettings as Record<string, any>;

  return {
    path: getCacheBasePath(workspace.basePath, path),
    environment,
    enabled,
  };
}
