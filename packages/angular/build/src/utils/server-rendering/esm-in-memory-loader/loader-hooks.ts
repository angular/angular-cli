/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JavaScriptTransformer } from '../../../tools/esbuild/javascript-transformer';

/**
 * @note For some unknown reason, setting `globalThis.ngServerMode = true` does not work when using ESM loader hooks.
 */
const NG_SERVER_MODE_INIT_BYTES = new TextEncoder().encode('var ngServerMode=true;');

/**
 * Node.js ESM loader to redirect imports to in memory files.
 * @see: https://nodejs.org/api/esm.html#loaders for more information about loaders.
 */

const MEMORY_URL_SCHEME = 'memory://';

export interface ESMInMemoryFileLoaderWorkerData {
  outputFiles: Record<string, string>;
  workspaceRoot: string;
}

let memoryVirtualRootUrl: string;
let outputFiles: Record<string, string>;

const javascriptTransformer = new JavaScriptTransformer(
  // Always enable JIT linking to support applications built with and without AOT.
  // In a development environment the additional scope information does not
  // have a negative effect unlike production where final output size is relevant.
  { sourcemap: true, jit: true },
  1,
);

export function initialize(data: ESMInMemoryFileLoaderWorkerData) {
  // This path does not actually exist but is used to overlay the in memory files with the
  // actual filesystem for resolution purposes.
  // A custom URL schema (such as `memory://`) cannot be used for the resolve output because
  // the in-memory files may use `import.meta.url` in ways that assume a file URL.
  // `createRequire` is one example of this usage.
  memoryVirtualRootUrl = pathToFileURL(
    join(data.workspaceRoot, `.angular/prerender-root/${randomUUID()}/`),
  ).href;
  outputFiles = data.outputFiles;
}

export function resolve(
  specifier: string,
  context: { parentURL: undefined | string },
  nextResolve: Function,
) {
  // In-memory files loaded from external code will contain a memory scheme
  if (specifier.startsWith(MEMORY_URL_SCHEME)) {
    let memoryUrl;
    try {
      memoryUrl = new URL(specifier);
    } catch {
      assert.fail('External code attempted to use malformed memory scheme: ' + specifier);
    }

    // Resolve with a URL based from the virtual filesystem root
    return {
      format: 'module',
      shortCircuit: true,
      url: new URL(memoryUrl.pathname.slice(1), memoryVirtualRootUrl).href,
    };
  }

  // Use next/default resolve if the parent is not from the virtual root
  if (!context.parentURL?.startsWith(memoryVirtualRootUrl)) {
    return nextResolve(specifier, context);
  }

  // Check for `./` and `../` relative specifiers
  const isRelative =
    specifier[0] === '.' &&
    (specifier[1] === '/' || (specifier[1] === '.' && specifier[2] === '/'));

  // Relative specifiers from memory file should be based from the parent memory location
  if (isRelative) {
    let specifierUrl;
    try {
      specifierUrl = new URL(specifier, context.parentURL);
    } catch {}

    if (
      specifierUrl?.pathname &&
      Object.hasOwn(outputFiles, specifierUrl.href.slice(memoryVirtualRootUrl.length))
    ) {
      return {
        format: 'module',
        shortCircuit: true,
        url: specifierUrl.href,
      };
    }

    assert.fail(
      `In-memory ESM relative file should always exist: '${context.parentURL}' --> '${specifier}'`,
    );
  }

  // Update the parent URL to allow for module resolution for the workspace.
  // This handles bare specifiers (npm packages) and absolute paths.
  // Defer to the next hook in the chain, which would be the
  // Node.js default resolve if this is the last user-specified loader.
  return nextResolve(specifier, {
    ...context,
    parentURL: new URL('index.js', memoryVirtualRootUrl).href,
  });
}

export async function load(url: string, context: { format?: string | null }, nextLoad: Function) {
  const { format } = context;

  // Load the file from memory if the URL is based in the virtual root
  if (url.startsWith(memoryVirtualRootUrl)) {
    const source = outputFiles[url.slice(memoryVirtualRootUrl.length)];
    assert(source !== undefined, 'Resolved in-memory ESM file should always exist: ' + url);

    // In-memory files have already been transformer during bundling and can be returned directly
    return {
      format,
      shortCircuit: true,
      source,
    };
  }

  // Only module files potentially require transformation. Angular libraries that would
  // need linking are ESM only.
  if (format === 'module' && isFileProtocol(url)) {
    const filePath = fileURLToPath(url);
    let source = await javascriptTransformer.transformFile(filePath);

    if (filePath.includes('@angular/')) {
      // Prepend 'var ngServerMode=true;' to the source.
      source = Buffer.concat([NG_SERVER_MODE_INIT_BYTES, source]);
    }

    return {
      format,
      shortCircuit: true,
      source,
    };
  }

  // Let Node.js handle all other URLs.
  return nextLoad(url);
}

function isFileProtocol(url: string): boolean {
  return url.startsWith('file://');
}

function handleProcessExit(): void {
  void javascriptTransformer.close();
}

process.once('exit', handleProcessExit);
process.once('SIGINT', handleProcessExit);
process.once('uncaughtException', handleProcessExit);
