/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isDynamicPattern } from 'fast-glob';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeRe as makeRegExpFromGlob } from 'picomatch';
import { assertIsError } from './error';
import { loadEsmModule } from './load-esm';

export async function loadProxyConfiguration(
  root: string,
  proxyConfig: string | undefined,
): Promise<Record<string, object> | undefined> {
  if (!proxyConfig) {
    return undefined;
  }

  const proxyPath = resolve(root, proxyConfig);

  if (!existsSync(proxyPath)) {
    throw new Error(`Proxy configuration file ${proxyPath} does not exist.`);
  }

  let proxyConfiguration;
  switch (extname(proxyPath)) {
    case '.json': {
      const content = await readFile(proxyPath, 'utf-8');

      const { parse, printParseErrorCode } = await import('jsonc-parser');
      const parseErrors: import('jsonc-parser').ParseError[] = [];
      proxyConfiguration = parse(content, parseErrors, { allowTrailingComma: true });

      if (parseErrors.length > 0) {
        let errorMessage = `Proxy configuration file ${proxyPath} contains parse errors:`;
        for (const parseError of parseErrors) {
          const { line, column } = getJsonErrorLineColumn(parseError.offset, content);
          errorMessage += `\n[${line}, ${column}] ${printParseErrorCode(parseError.error)}`;
        }
        throw new Error(errorMessage);
      }

      break;
    }
    case '.mjs':
      // Load the ESM configuration file using the TypeScript dynamic import workaround.
      // Once TypeScript provides support for keeping the dynamic import this workaround can be
      // changed to a direct dynamic import.
      proxyConfiguration = (await loadEsmModule<{ default: unknown }>(pathToFileURL(proxyPath)))
        .default;
      break;
    case '.cjs':
      proxyConfiguration = require(proxyPath);
      break;
    default:
      // The file could be either CommonJS or ESM.
      // CommonJS is tried first then ESM if loading fails.
      try {
        proxyConfiguration = require(proxyPath);
        break;
      } catch (e) {
        assertIsError(e);
        if (e.code === 'ERR_REQUIRE_ESM' || e.code === 'ERR_REQUIRE_ASYNC_MODULE') {
          // Load the ESM configuration file using the TypeScript dynamic import workaround.
          // Once TypeScript provides support for keeping the dynamic import this workaround can be
          // changed to a direct dynamic import.
          proxyConfiguration = (await loadEsmModule<{ default: unknown }>(pathToFileURL(proxyPath)))
            .default;
          break;
        }

        throw e;
      }
  }

  return normalizeProxyConfiguration(proxyConfiguration);
}

/**
 * Converts glob patterns to regular expressions to support Vite's proxy option.
 * Also converts the Webpack supported array form to an object form supported by both.
 *
 * @param proxy A proxy configuration object.
 */
function normalizeProxyConfiguration(
  proxy: Record<string, object> | object[],
): Record<string, object> {
  let normalizedProxy: Record<string, object> | undefined;

  if (Array.isArray(proxy)) {
    // Construct an object-form proxy configuration from the array
    normalizedProxy = {};
    for (const proxyEntry of proxy) {
      if (!('context' in proxyEntry)) {
        continue;
      }
      if (!Array.isArray(proxyEntry.context)) {
        continue;
      }

      // Array-form entries contain a context string array with the path(s)
      // to use for the configuration entry.
      const context = proxyEntry.context;
      delete proxyEntry.context;
      for (const contextEntry of context) {
        if (typeof contextEntry !== 'string') {
          continue;
        }

        normalizedProxy[contextEntry] = proxyEntry;
      }
    }
  } else {
    normalizedProxy = proxy;
  }

  // TODO: Consider upstreaming glob support
  for (const key of Object.keys(normalizedProxy)) {
    if (key[0] !== '^' && isDynamicPattern(key)) {
      const pattern = makeRegExpFromGlob(key).source;
      normalizedProxy[pattern] = normalizedProxy[key];
      delete normalizedProxy[key];
    }
  }

  // Replace `pathRewrite` field with a `rewrite` function
  for (const proxyEntry of Object.values(normalizedProxy)) {
    if (
      typeof proxyEntry === 'object' &&
      'pathRewrite' in proxyEntry &&
      proxyEntry.pathRewrite &&
      typeof proxyEntry.pathRewrite === 'object'
    ) {
      // Preprocess path rewrite entries
      const pathRewriteEntries: [RegExp, string][] = [];
      for (const [pattern, value] of Object.entries(
        proxyEntry.pathRewrite as Record<string, string>,
      )) {
        pathRewriteEntries.push([new RegExp(pattern), value]);
      }

      (proxyEntry as Record<string, unknown>).rewrite = pathRewriter.bind(
        undefined,
        pathRewriteEntries,
      );

      delete proxyEntry.pathRewrite;
    }
  }

  return normalizedProxy;
}

function pathRewriter(pathRewriteEntries: [RegExp, string][], path: string): string {
  for (const [pattern, value] of pathRewriteEntries) {
    const updated = path.replace(pattern, value);
    if (path !== updated) {
      return updated;
    }
  }

  return path;
}

/**
 * Calculates the line and column for an error offset in the content of a JSON file.
 * @param location The offset error location from the beginning of the content.
 * @param content The full content of the file containing the error.
 * @returns An object containing the line and column
 */
function getJsonErrorLineColumn(offset: number, content: string) {
  if (offset === 0) {
    return { line: 1, column: 1 };
  }

  let line = 0;
  let position = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    ++line;

    const nextNewline = content.indexOf('\n', position);
    if (nextNewline === -1 || nextNewline > offset) {
      break;
    }

    position = nextNewline + 1;
  }

  return { line, column: offset - position + 1 };
}
