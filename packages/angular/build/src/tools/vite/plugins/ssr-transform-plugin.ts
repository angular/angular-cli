/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import remapping, { SourceMapInput } from '@ampproject/remapping';
import type { Plugin } from 'vite';
import { loadEsmModule } from '../../../utils/load-esm';

export async function createAngularSsrTransformPlugin(workspaceRoot: string): Promise<Plugin> {
  const { normalizePath } = await loadEsmModule<typeof import('vite')>('vite');

  return {
    name: 'vite:angular-ssr-transform',
    enforce: 'pre',
    async configureServer(server) {
      const originalssrTransform = server.ssrTransform;

      server.ssrTransform = async (code, map, url, originalCode) => {
        const result = await originalssrTransform(code, null, url, originalCode);
        if (!result || !result.map || !map) {
          return result;
        }

        const remappedMap = remapping(
          [result.map as SourceMapInput, map as SourceMapInput],
          () => null,
        );

        // Set the sourcemap root to the workspace root. This is needed since we set a virtual path as root.
        remappedMap.sourceRoot = normalizePath(workspaceRoot) + '/';

        return {
          ...result,
          map: remappedMap as (typeof result)['map'],
        };
      };
    },
  };
}
