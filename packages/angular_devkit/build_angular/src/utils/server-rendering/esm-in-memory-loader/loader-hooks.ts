/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'url';
import { callInitializeIfNeeded } from './node-18-utils';

/**
 * Node.js ESM loader to redirect imports to in memory files.
 * @see: https://nodejs.org/api/esm.html#loaders for more information about loaders.
 */

export interface ESMInMemoryFileLoaderWorkerData {
  outputFiles: Record<string, string>;
  workspaceRoot: string;
}

const CHUNKS_REGEXP = /file:\/\/\/((?:main|render-utils)\.server|chunk-\w+)\.mjs/;
let workspaceRootFile: string;
let outputFiles: Record<string, string>;

callInitializeIfNeeded(initialize);

export function initialize(data: ESMInMemoryFileLoaderWorkerData) {
  workspaceRootFile = pathToFileURL(join(data.workspaceRoot, 'index.mjs')).href;
  outputFiles = data.outputFiles;
}

export function resolve(
  specifier: string,
  context: { parentURL: undefined | string },
  nextResolve: Function,
) {
  if (!isFileProtocol(specifier)) {
    const normalizedSpecifier = specifier.replace(/^\.\//, '');
    if (normalizedSpecifier in outputFiles) {
      return {
        format: 'module',
        shortCircuit: true,
        // File URLs need to absolute. In Windows these also need to include the drive.
        // The `/` will be resolved to the drive letter.
        url: pathToFileURL('/' + normalizedSpecifier).href,
      };
    }
  }

  // Defer to the next hook in the chain, which would be the
  // Node.js default resolve if this is the last user-specified loader.
  return nextResolve(
    specifier,
    isBundleEntryPointOrChunk(context) ? { ...context, parentURL: workspaceRootFile } : context,
  );
}

export async function load(url: string, context: { format?: string | null }, nextLoad: Function) {
  const { format } = context;

  // CommonJs modules require no transformations and are not in memory.
  if (format !== 'commonjs' && isFileProtocol(url)) {
    const filePath = fileURLToPath(url);
    // Remove '/' or drive letter for Windows that was added in the above 'resolve'.
    const source = outputFiles[relative('/', filePath)];
    if (source !== undefined) {
      return {
        format,
        shortCircuit: true,
        source,
      };
    }
  }

  // Let Node.js handle all other URLs.
  return nextLoad(url);
}

function isFileProtocol(url: string): boolean {
  return url.startsWith('file://');
}

function isBundleEntryPointOrChunk(context: { parentURL: undefined | string }): boolean {
  return !!context.parentURL && CHUNKS_REGEXP.test(context.parentURL);
}
