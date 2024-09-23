/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { loadEsmModule } from '../../../utils/load-esm';
import { AngularMemoryOutputFiles } from '../utils';

interface AngularMemoryPluginOptions {
  virtualProjectRoot: string;
  outputFiles: AngularMemoryOutputFiles;
  external?: string[];
}

export async function createAngularMemoryPlugin(
  options: AngularMemoryPluginOptions,
): Promise<Plugin> {
  const { virtualProjectRoot, outputFiles, external } = options;
  const { normalizePath } = await loadEsmModule<typeof import('vite')>('vite');
  // See: https://github.com/vitejs/vite/blob/a34a73a3ad8feeacc98632c0f4c643b6820bbfda/packages/vite/src/node/server/pluginContainer.ts#L331-L334
  const defaultImporter = join(virtualProjectRoot, 'index.html');

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

      if (importer) {
        let normalizedSource: string | undefined;
        if (source[0] === '.' && normalizePath(importer).startsWith(virtualProjectRoot)) {
          // Remove query if present
          const [importerFile] = importer.split('?', 1);
          normalizedSource = join(dirname(relative(virtualProjectRoot, importerFile)), source);
        } else if (source[0] === '/' && importer === defaultImporter) {
          normalizedSource = basename(source);
        }
        if (normalizedSource) {
          source = '/' + normalizePath(normalizedSource);
        }
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
