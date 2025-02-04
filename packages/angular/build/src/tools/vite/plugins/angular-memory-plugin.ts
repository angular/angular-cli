/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { loadEsmModule } from '../../../utils/load-esm';
import { AngularMemoryOutputFiles } from '../utils';

interface AngularMemoryPluginOptions {
  virtualProjectRoot: string;
  outputFiles: AngularMemoryOutputFiles;
  templateUpdates?: ReadonlyMap<string, string>;
  external?: string[];
  disableViteTransport?: boolean;
}

const ANGULAR_PREFIX = '/@ng/';
const VITE_FS_PREFIX = '/@fs/';
const FILE_PROTOCOL = 'file:';

export async function createAngularMemoryPlugin(
  options: AngularMemoryPluginOptions,
): Promise<Plugin> {
  const { virtualProjectRoot, outputFiles, external } = options;
  const { normalizePath } = await loadEsmModule<typeof import('vite')>('vite');

  return {
    name: 'vite:angular-memory',
    // Ensures plugin hooks run before built-in Vite hooks
    enforce: 'pre',
    async resolveId(source, importer, { ssr }) {
      if (source.startsWith(VITE_FS_PREFIX)) {
        return;
      }

      // For SSR with component HMR, pass through as a virtual module
      if (ssr && source.startsWith(FILE_PROTOCOL) && source.includes(ANGULAR_PREFIX)) {
        // Vite will resolve these these files example:
        // `file:///@ng/component?c=src%2Fapp%2Fapp.component.ts%40AppComponent&t=1737017253850`
        const sourcePath = fileURLToPath(source);
        const sourceWithoutRoot = normalizePath('/' + relative(virtualProjectRoot, sourcePath));

        if (sourceWithoutRoot.startsWith(ANGULAR_PREFIX)) {
          const [, query] = source.split('?', 2);

          return `\0${sourceWithoutRoot}?${query}`;
        }
      }

      // Prevent vite from resolving an explicit external dependency (`externalDependencies` option)
      if (external?.includes(source)) {
        // This is still not ideal since Vite will still transform the import specifier to
        // `/@id/${source}` but is currently closer to a raw external than a resolved file path.
        return source;
      }

      if (importer && source[0] === '.') {
        const normalizedImporter = normalizePath(importer);
        if (normalizedImporter.startsWith(virtualProjectRoot)) {
          // Remove query if present
          const [importerFile] = normalizedImporter.split('?', 1);
          source = '/' + join(dirname(relative(virtualProjectRoot, importerFile)), source);
        }
      }

      const [file] = source.split('?', 1);
      if (outputFiles.has(normalizePath(file))) {
        return join(virtualProjectRoot, source);
      }
    },
    load(id, loadOptions) {
      // For SSR component updates, return the component update module or empty if none
      if (loadOptions?.ssr && id.startsWith(`\0${ANGULAR_PREFIX}`)) {
        // Extract component identifier (first character is rollup virtual module null)
        const requestUrl = new URL(id.slice(1), 'http://localhost');
        const componentId = requestUrl.searchParams.get('c');

        return (componentId && options.templateUpdates?.get(encodeURIComponent(componentId))) ?? '';
      }

      const [file] = id.split('?', 1);
      const relativeFile = '/' + normalizePath(relative(virtualProjectRoot, file));
      const codeContents = outputFiles.get(relativeFile)?.contents;
      if (codeContents === undefined) {
        if (relativeFile.endsWith('/node_modules/vite/dist/client/client.mjs')) {
          return loadViteClientCode(file, options.disableViteTransport);
        }

        return undefined;
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
async function loadViteClientCode(file: string, disableViteTransport = false): Promise<string> {
  const originalContents = await readFile(file, 'utf-8');
  let updatedContents = originalContents.replace(
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

  if (disableViteTransport) {
    const previousUpdatedContents = updatedContents;

    updatedContents = updatedContents.replace('transport.connect(handleMessage)', '');
    assert(
      previousUpdatedContents !== updatedContents,
      'Failed to update Vite client WebSocket disable.',
    );

    updatedContents = updatedContents.replace('console.debug("[vite] connecting...")', '');
  }

  return updatedContents;
}
