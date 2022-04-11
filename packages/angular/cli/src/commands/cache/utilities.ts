/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { isJsonObject } from '@angular-devkit/core';
import { resolve } from 'path';
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

export function getCacheConfig(workspace: AngularWorkspace | undefined): Required<Cache> {
  if (!workspace) {
    throw new Error(`Cannot retrieve cache configuration as workspace is not defined.`);
  }

  const defaultSettings: Required<Cache> = {
    path: resolve(workspace.basePath, '.angular/cache'),
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
    path = defaultSettings.path,
    environment = defaultSettings.environment,
    enabled = defaultSettings.enabled,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = cacheSettings as Record<string, any>;

  return {
    path: resolve(workspace.basePath, path),
    environment,
    enabled,
  };
}
