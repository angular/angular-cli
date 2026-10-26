/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { toPosixPath } from '../../utils/path';

/**
 * Filter matching the Domino bundle import inside `@angular/platform-server`.
 */
const BUNDLED_DOMINO_FILTER = /(?:^|[\\/])bundled-domino(?:\.[cm]?js)?$/;

/**
 * The property name on `globalThis` where the Domino instance is stored.
 */
const DOMINO_GLOBAL_PROPERTY = 'ɵdomino';

/**
 * Creates an esbuild plugin that attaches the Domino instance to `globalThis` when
 * `@angular/platform-server/init` is bundled into the server polyfills bundle.
 *
 * @returns An esbuild plugin.
 */
export function createPlatformServerDominoExposePlugin(): Plugin {
  return {
    name: 'angular-platform-server-domino-expose',
    setup(build) {
      build.onResolve({ filter: BUNDLED_DOMINO_FILTER }, (args) =>
        args.namespace !== 'angular:domino-expose' && args.kind === 'import-statement'
          ? {
              path: resolve(args.resolveDir, args.path),
              namespace: 'angular:domino-expose',
            }
          : null,
      );

      build.onLoad({ filter: /./, namespace: 'angular:domino-expose' }, (args) => ({
        contents: [
          `import domino from ${JSON.stringify(toPosixPath(args.path))};`,
          `globalThis['${DOMINO_GLOBAL_PROPERTY}'] = domino;`,
          `export default domino;`,
        ].join('\n'),
        loader: 'js',
        resolveDir: dirname(args.path),
      }));
    },
  };
}

/**
 * Creates an esbuild plugin that redirects imports of Domino in `@angular/platform-server`
 * to the single copy attached to `globalThis` by the server polyfills bundle.
 *
 * @returns An esbuild plugin.
 */
export function createPlatformServerDominoPlugin(): Plugin {
  return {
    name: 'angular-platform-server-domino-consume',
    setup(build) {
      build.onResolve({ filter: BUNDLED_DOMINO_FILTER }, (args) =>
        args.kind === 'import-statement'
          ? {
              path: 'angular:platform-server-domino',
              namespace: 'angular:platform-server-domino',
            }
          : null,
      );

      build.onLoad({ filter: /./, namespace: 'angular:platform-server-domino' }, () => ({
        contents: `export default globalThis['${DOMINO_GLOBAL_PROPERTY}'];`,
        loader: 'js',
      }));
    },
  };
}
