/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin, PluginBuild } from 'esbuild';
import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { toPosixPath } from '../../utils/path';

/**
 * The name of the export in the server polyfills bundle that provides the Domino DOM
 * implementation to the other server bundles.
 */
const SERVER_POLYFILLS_DOMINO_EXPORT = 'ɵdomino';

/**
 * The server polyfills bundle filename. Other server bundles import Domino from this file.
 */
const SERVER_POLYFILLS_FILENAME = './polyfills.server.mjs';

/**
 * The path of the Domino bundle within the `@angular/platform-server` package.
 * `@angular/platform-server/init` and `@angular/platform-server` both import this file.
 */
const DOMINO_PACKAGE_PATH = 'third_party/domino/bundled-domino.mjs';

/**
 * The import specifier used by the `@angular/platform-server` entry points to import Domino.
 */
const DOMINO_IMPORT_SPECIFIER = '../' + DOMINO_PACKAGE_PATH;

const DOMINO_NAMESPACE = 'angular:platform-server-domino';

/**
 * Resolves the path of the Domino bundle within the `@angular/platform-server` package
 * that is used by the application.
 *
 * `@angular/platform-server/init` (bundled into the server polyfills) and
 * `@angular/platform-server` (bundled into the main server bundle) both contain a copy of
 * Domino when bundled separately. The server polyfills bundle exports its copy via
 * `SERVER_POLYFILLS_DOMINO_EXPORT` so that the other server bundles can share it instead of
 * bundling their own.
 *
 * @param build The esbuild plugin build used to resolve the package.
 * @param workspaceRoot The root directory of the workspace.
 * @returns The absolute path to the Domino bundle, or `undefined` if it cannot be shared.
 */
export async function resolvePlatformServerDomino(
  build: PluginBuild,
  workspaceRoot: string,
): Promise<string | undefined> {
  const result = await build.resolve('@angular/platform-server/package.json', {
    kind: 'import-statement',
    resolveDir: workspaceRoot,
  });

  // The package is not installed or will not be bundled.
  if (result.errors.length > 0 || result.external || !result.path) {
    return undefined;
  }

  const dominoPath = join(dirname(result.path), DOMINO_PACKAGE_PATH);
  try {
    await access(dominoPath);
  } catch {
    // Unexpected package layout. Each bundle will contain its own copy of Domino.
    return undefined;
  }

  return dominoPath;
}

/**
 * Creates the module content that re-exports Domino from the server polyfills bundle.
 *
 * @param dominoPath The absolute path to the Domino bundle.
 * @returns The module content.
 */
export function createPlatformServerDominoExport(dominoPath: string): string {
  const specifier = JSON.stringify(toPosixPath(dominoPath));

  return `export { default as ${SERVER_POLYFILLS_DOMINO_EXPORT} } from ${specifier};`;
}

/**
 * Creates a plugin that redirects the Domino import of `@angular/platform-server` to the
 * copy exported by the server polyfills bundle.
 *
 * The server polyfills bundle is imported by every server bundle before any other code and
 * is marked as external. This ensures a single copy of Domino is loaded at runtime, which
 * also keeps the DOM globals provided by `@angular/platform-server/init` consistent with the
 * DOM implementation used by the server platform.
 *
 * @param workspaceRoot The root directory of the workspace.
 * @returns An esbuild plugin.
 */
export function createPlatformServerDominoPlugin(workspaceRoot: string): Plugin {
  return {
    name: 'angular-platform-server-domino',
    setup(build) {
      let sharedDominoPath: Promise<string | undefined> | undefined;

      build.onResolve({ filter: /bundled-domino\.mjs$/ }, async (args) => {
        if (args.path !== DOMINO_IMPORT_SPECIFIER || args.kind !== 'import-statement') {
          return null;
        }

        sharedDominoPath ??= resolvePlatformServerDomino(build, workspaceRoot);
        const dominoPath = await sharedDominoPath;

        // Only redirect imports of the exact file exported by the server polyfills bundle.
        if (!dominoPath || resolve(args.resolveDir, args.path) !== dominoPath) {
          return null;
        }

        // The path must not look like a JavaScript file to avoid other plugins loading it.
        return {
          path: DOMINO_NAMESPACE,
          namespace: DOMINO_NAMESPACE,
        };
      });

      build.onLoad({ filter: /./, namespace: DOMINO_NAMESPACE }, () => ({
        contents:
          `export { ${SERVER_POLYFILLS_DOMINO_EXPORT} as default } ` +
          `from '${SERVER_POLYFILLS_FILENAME}';`,
        loader: 'js',
        resolveDir: workspaceRoot,
      }));
    },
  };
}
