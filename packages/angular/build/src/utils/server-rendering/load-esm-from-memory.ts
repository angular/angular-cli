/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { assertIsError } from '../error';
import { loadEsmModule } from '../load-esm';
import { MainServerBundleExports, RenderUtilsServerBundleExports } from './main-bundle-exports';

export function loadEsmModuleFromMemory(
  path: './main.server.mjs',
): Promise<MainServerBundleExports>;
export function loadEsmModuleFromMemory(
  path: './render-utils.server.mjs',
): Promise<RenderUtilsServerBundleExports>;
export function loadEsmModuleFromMemory(path: string): Promise<unknown> {
  return loadEsmModule(new URL(path, 'memory://')).catch((e) => {
    assertIsError(e);

    // While the error is an 'instanceof Error', it is extended with non transferable properties
    // and cannot be transferred from a worker when using `--import`. This results in the error object
    // displaying as '[Object object]' when read outside of the worker. Therefore, we reconstruct the error message here.
    const error: Error & { code?: string } = new Error(e.message);
    error.stack = e.stack;
    error.name = e.name;
    error.code = e.code;

    throw error;
  });
}
