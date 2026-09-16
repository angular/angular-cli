/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

if (!globalThis.__angularCliTestEsmHookRegistered) {
  globalThis.__angularCliTestEsmHookRegistered = true;
  register(import.meta.url);
}

export async function resolve(specifier, context, nextResolve) {
  try {
    const res = await nextResolve(specifier, context);
    if (res.url.endsWith('.md')) {
      return { ...res, format: 'module' };
    }
    return res;
  } catch (err) {
    if (err && (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT')) {
      for (const suffix of ['.js', '/index.js', '.json']) {
        try {
          return await nextResolve(specifier + suffix, context);
        } catch {}
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.md')) {
    const content = await readFile(fileURLToPath(url), 'utf-8');
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(content)};`,
    };
  }

  return nextLoad(url, context);
}
