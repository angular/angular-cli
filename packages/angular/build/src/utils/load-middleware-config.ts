/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Connect } from 'vite';
import { assertIsError } from './error';
import { loadEsmModule } from './load-esm';

export async function loadMiddlewareConfiguration(
  root: string,
  middlewareConfig: string | undefined,
): Promise<Connect.NextHandleFunction[]> {
  if (!middlewareConfig) {
    return [];
  }

  const middlewarePath = resolve(root, middlewareConfig);

  if (!existsSync(middlewarePath)) {
    throw new Error(`Middleware configuration file ${middlewarePath} does not exist.`);
  }

  let middlewareConfiguration;

  try {
    middlewareConfiguration = await import(pathToFileURL(middlewarePath).href);
  } catch (e) {
    assertIsError(e);
    if (e.code !== 'ERR_REQUIRE_ASYNC_MODULE') {
      throw e;
    }

    middlewareConfiguration = await loadEsmModule<{ default: unknown }>(
      pathToFileURL(middlewarePath),
    );
  }

  if ('default' in middlewareConfiguration) {
    middlewareConfiguration = middlewareConfiguration.default;
  }

  return Array.isArray(middlewareConfiguration)
    ? middlewareConfiguration
    : [middlewareConfiguration];
}
