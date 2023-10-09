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
import { JavaScriptTransformer } from '../../../tools/esbuild/javascript-transformer';
import { callInitializeIfNeeded } from './node-18-utils';

/**
 * Node.js ESM loader to redirect imports to in memory files.
 * @see: https://nodejs.org/api/esm.html#loaders for more information about loaders.
 */

export interface ESMInMemoryFileLoaderWorkerData {
  outputFiles: Record<string, string>;
  workspaceRoot: string;
}

const TRANSFORMED_FILES: Record<string, string> = {};
const CHUNKS_REGEXP = /file:\/\/\/(main\.server|chunk-\w+)\.mjs/;
let workspaceRootFile: string;
let outputFiles: Record<string, string>;

const javascriptTransformer = new JavaScriptTransformer(
  // Always enable JIT linking to support applications built with and without AOT.
  // In a development environment the additional scope information does not
  // have a negative effect unlike production where final output size is relevant.
  { sourcemap: true, jit: true },
  1,
);

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
  if (isFileProtocol(url)) {
    const filePath = fileURLToPath(url);
    // Remove '/' or drive letter for Windows that was added in the above 'resolve'.
    let source = outputFiles[relative('/', filePath)] ?? TRANSFORMED_FILES[filePath];

    if (source === undefined) {
      source = TRANSFORMED_FILES[filePath] = Buffer.from(
        await javascriptTransformer.transformFile(filePath),
      ).toString('utf-8');
    }

    if (source !== undefined) {
      const { format } = context;

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

function handleProcessExit(): void {
  void javascriptTransformer.close();
}

function isBundleEntryPointOrChunk(context: { parentURL: undefined | string }): boolean {
  return !!context.parentURL && CHUNKS_REGEXP.test(context.parentURL);
}

process.once('exit', handleProcessExit);
process.once('SIGINT', handleProcessExit);
process.once('uncaughtException', handleProcessExit);
