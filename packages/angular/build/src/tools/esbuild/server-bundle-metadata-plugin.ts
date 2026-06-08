/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'esbuild';

/**
 * Generates an esbuild plugin that appends metadata to the output bundle,
 * marking it with server-side rendering (SSR) details for Angular SSR scenarios.
 *
 * @param options Optional configuration object.
 * - `ssrEntryBundle`: If `true`, marks the bundle as an SSR entry point.
 *
 * @remarks We can't rely on `platform: node` or `platform: neutral`, as the latter
 *       is used for non-SSR-related code too (e.g., global scripts).
 * @returns An esbuild plugin that injects SSR metadata into the build result's metafile.
 */
export function createServerBundleMetadata(options?: { ssrEntryBundle?: boolean }): Plugin {
  return {
    name: 'angular-server-bundle-metadata',
    setup(build) {
      build.onEnd((result) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metafile = result.metafile as any;
        if (metafile) {
          metafile['ng-ssr-entry-bundle'] = !!options?.ssrEntryBundle;
          metafile['ng-platform-server'] = true;
        }
      });
    },
  };
}
