/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { workerData } from 'node:worker_threads';
import { fileURLToPath } from 'url';

/**
 * Node.js ESM loader to redirect imports to in memory files.
 * @see: https://nodejs.org/api/esm.html#loaders for more information about loaders.
 */

const { outputFiles } = workerData as {
  outputFiles: Record<string, string>;
};

export function resolve(specifier: string, context: {}, nextResolve: Function) {
  if (!isFileProtocol(specifier)) {
    const normalizedSpecifier = specifier.replace(/^\.\//, '');
    if (normalizedSpecifier in outputFiles) {
      return {
        format: 'module',
        shortCircuit: true,
        url: new URL(normalizedSpecifier, 'file:').href,
      };
    }
  }

  // Defer to the next hook in the chain, which would be the
  // Node.js default resolve if this is the last user-specified loader.
  return nextResolve(specifier);
}

export function load(url: string, context: { format?: string | null }, nextLoad: Function) {
  if (isFileProtocol(url)) {
    const source = outputFiles[fileURLToPath(url).slice(1)]; // Remove leading slash
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
