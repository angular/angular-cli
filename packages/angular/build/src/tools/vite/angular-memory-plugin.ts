/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import remapping, { SourceMapInput } from '@ampproject/remapping';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { Connect, Plugin } from 'vite';
import {
  angularHtmlFallbackMiddleware,
  createAngularAssetsMiddleware,
  createAngularIndexHtmlMiddleware,
  createAngularSSRMiddleware,
} from './middlewares';
import { AngularMemoryOutputFiles } from './utils';

export interface AngularMemoryPluginOptions {
  workspaceRoot: string;
  virtualProjectRoot: string;
  outputFiles: AngularMemoryOutputFiles;
  assets: Map<string, string>;
  ssr: boolean;
  external?: string[];
  extensionMiddleware?: Connect.NextHandleFunction[];
  indexHtmlTransformer?: (content: string) => Promise<string>;
  normalizePath: (path: string) => string;
  usedComponentStyles: Map<string, string[]>;
}

export function createAngularMemoryPlugin(options: AngularMemoryPluginOptions): Plugin {
  const {
    workspaceRoot,
    virtualProjectRoot,
    outputFiles,
    assets,
    external,
    ssr,
    extensionMiddleware,
    indexHtmlTransformer,
    normalizePath,
    usedComponentStyles,
  } = options;

  return {
    name: 'vite:angular-memory',
    // Ensures plugin hooks run before built-in Vite hooks
    enforce: 'pre',
    async resolveId(source, importer) {
      // Prevent vite from resolving an explicit external dependency (`externalDependencies` option)
      if (external?.includes(source)) {
        // This is still not ideal since Vite will still transform the import specifier to
        // `/@id/${source}` but is currently closer to a raw external than a resolved file path.
        return source;
      }

      if (importer && source[0] === '.' && normalizePath(importer).startsWith(virtualProjectRoot)) {
        // Remove query if present
        const [importerFile] = importer.split('?', 1);

        source =
          '/' + normalizePath(join(dirname(relative(virtualProjectRoot, importerFile)), source));
      }

      const [file] = source.split('?', 1);
      if (outputFiles.has(file)) {
        return join(virtualProjectRoot, source);
      }
    },
    load(id) {
      const [file] = id.split('?', 1);
      const relativeFile = '/' + normalizePath(relative(virtualProjectRoot, file));
      const codeContents = outputFiles.get(relativeFile)?.contents;
      if (codeContents === undefined) {
        return relativeFile.endsWith('/node_modules/vite/dist/client/client.mjs')
          ? loadViteClientCode(file)
          : undefined;
      }

      const code = Buffer.from(codeContents).toString('utf-8');
      const mapContents = outputFiles.get(relativeFile + '.map')?.contents;

      return {
        // Remove source map URL comments from the code if a sourcemap is present.
        // Vite will inline and add an additional sourcemap URL for the sourcemap.
        code: mapContents ? code.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '') : code,
        map: mapContents && Buffer.from(mapContents).toString('utf-8'),
      };
    },
    // eslint-disable-next-line max-lines-per-function
    configureServer(server) {
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

      // Assets and resources get handled first
      server.middlewares.use(
        createAngularAssetsMiddleware(server, assets, outputFiles, usedComponentStyles),
      );

      if (extensionMiddleware?.length) {
        extensionMiddleware.forEach((middleware) => server.middlewares.use(middleware));
      }

      // Returning a function, installs middleware after the main transform middleware but
      // before the built-in HTML middleware
      return () => {
        if (ssr) {
          server.middlewares.use(createAngularSSRMiddleware(server, indexHtmlTransformer));
        }

        server.middlewares.use(angularHtmlFallbackMiddleware);

        server.middlewares.use(
          createAngularIndexHtmlMiddleware(server, outputFiles, indexHtmlTransformer),
        );
      };
    },
  };
}

/**
 * Reads the resolved Vite client code from disk and updates the content to remove
 * an unactionable suggestion to update the Vite configuration file to disable the
 * error overlay. The Vite configuration file is not present when used in the Angular
 * CLI.
 * @param file The absolute path to the Vite client code.
 * @returns
 */
async function loadViteClientCode(file: string): Promise<string> {
  const originalContents = await readFile(file, 'utf-8');
  const updatedContents = originalContents.replace(
    `"You can also disable this overlay by setting ",
      h("code", { part: "config-option-name" }, "server.hmr.overlay"),
      " to ",
      h("code", { part: "config-option-value" }, "false"),
      " in ",
      h("code", { part: "config-file-name" }, hmrConfigName),
      "."`,
    '',
  );

  assert(originalContents !== updatedContents, 'Failed to update Vite client error overlay text.');

  return updatedContents;
}
