/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import remapping, { SourceMapInput } from '@jridgewell/remapping';
import type { Plugin } from 'vite';
import { loadEsmModule } from '../../../utils/load-esm';

export async function createAngularSsrTransformPlugin(workspaceRoot: string): Promise<Plugin> {
  const { normalizePath } = await loadEsmModule<typeof import('vite')>('vite');

  return {
    name: 'vite:angular-ssr-transform',
    enforce: 'post',
    transform(code, _id, { ssr, inMap }: { ssr?: boolean; inMap?: SourceMapInput } = {}) {
      if (!ssr || !inMap) {
        return null;
      }

      const remappedMap = remapping([inMap], () => null);
      // Set the sourcemap root to the workspace root. This is needed since we set a virtual path as root.
      remappedMap.sourceRoot = normalizePath(workspaceRoot) + '/';

      return {
        code,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map: remappedMap as any,
      };
    },
  };
}
