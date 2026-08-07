/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { EncodedSourceMap } from '@ampproject/remapping';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Removes `//# sourceMappingURL=` comments safely from the given JavaScript code,
 * ignoring any occurrences that are inside string literals, template literals, or block comments.
 *
 * It uses a lightweight state-machine parser to accurately handle nested template literals.
 *
 * @param code The JavaScript source code.
 * @returns The code with top-level sourcemap comments removed.
 */
export function removeSourceMappingURL(code: string): string {
  if (!code.includes('//# sourceMappingURL=')) {
    return code;
  }

  const result: string[] = [];
  let lastCopiedIndex = 0;
  let i = 0;
  const len = code.length;

  // Stack to track template literal state and curly brace depth for nested interpolations.
  const stack: { type: 'template'; braceDepth: number }[] = [];
  let currentState:
    'normal' | 'string_double' | 'string_single' | 'template' | 'comment_block' | 'comment_line' =
    'normal';

  while (i < len) {
    const char = code[i];
    const nextChar = code[i + 1];

    if (currentState === 'normal') {
      if (char === '/' && nextChar === '*') {
        currentState = 'comment_block';
        i += 2;
        continue;
      }
      if (char === '/' && nextChar === '/') {
        // Detect if the comment is escaped (e.g. inside a regex literal like `/\/\/#/`).
        let isEscaped = false;
        let prevIdx = i - 1;
        while (prevIdx >= 0 && /\s/.test(code[prevIdx])) {
          prevIdx--;
        }
        if (prevIdx >= 0 && code[prevIdx] === '\\') {
          let bsCount = 0;
          while (prevIdx >= 0 && code[prevIdx] === '\\') {
            bsCount++;
            prevIdx--;
          }
          if (bsCount % 2 === 1) {
            isEscaped = true;
          }
        }

        if (!isEscaped && code.startsWith('//# sourceMappingURL=', i)) {
          if (i > lastCopiedIndex) {
            result.push(code.slice(lastCopiedIndex, i));
          }
          // Skip the rest of the comment line up to the newline
          i += 21;
          while (i < len && code[i] !== '\n' && code[i] !== '\r') {
            i++;
          }
          lastCopiedIndex = i;
          continue;
        } else {
          currentState = 'comment_line';
          i += 2;
          continue;
        }
      }
      if (char === '"') {
        currentState = 'string_double';
        i++;
        continue;
      }
      if (char === "'") {
        currentState = 'string_single';
        i++;
        continue;
      }
      if (char === '`') {
        currentState = 'template';
        stack.push({ type: 'template', braceDepth: 0 });
        i++;
        continue;
      }
      if (char === '{') {
        const top = stack[stack.length - 1];
        if (top) {
          top.braceDepth++;
        }
        i++;
        continue;
      }
      if (char === '}') {
        const top = stack[stack.length - 1];
        if (top) {
          top.braceDepth--;
          if (top.braceDepth < 0) {
            // Exiting a template literal interpolation ${ ... }
            stack.pop();
            currentState = 'template';
            i++;
            continue;
          }
        }
        i++;
        continue;
      }

      i++;
    } else if (currentState === 'string_double') {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === '"') {
        currentState = 'normal';
      }
      i++;
    } else if (currentState === 'string_single') {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === "'") {
        currentState = 'normal';
      }
      i++;
    } else if (currentState === 'template') {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === '$' && nextChar === '{') {
        // Entering template literal interpolation context
        currentState = 'normal';
        stack.push({ type: 'template', braceDepth: 0 });
        i += 2;
        continue;
      }
      if (char === '`') {
        stack.pop();
        currentState = 'normal';
      }
      i++;
    } else if (currentState === 'comment_block') {
      if (char === '*' && nextChar === '/') {
        currentState = 'normal';
        i += 2;
        continue;
      }
      i++;
    } else if (currentState === 'comment_line') {
      if (char === '\n' || char === '\r') {
        currentState = 'normal';
      }
      i++;
    }
  }

  if (lastCopiedIndex === 0) {
    return code;
  }

  if (lastCopiedIndex < len) {
    result.push(code.slice(lastCopiedIndex));
  }

  return result.join('');
}

/**
 * Extracts the base64 payload from an inline sourcemap data URI line and verifies
 * that only trailing whitespace follows the payload.
 *
 * @returns The base64 payload string if valid and trailing, or `undefined` otherwise.
 */
function extractTrailingBase64Payload(urlLine: string): string | undefined {
  if (!urlLine.startsWith('data:application/json;')) {
    return undefined;
  }

  const base64StartIndex = urlLine.indexOf('base64,');
  if (base64StartIndex === -1) {
    return undefined;
  }

  const payloadStart = base64StartIndex + 7;
  let payloadEnd = urlLine.length;
  // Find the first trailing whitespace character that marks the end of the base64 payload.
  for (let i = payloadStart; i < urlLine.length; i++) {
    const char = urlLine[i];
    if (char === ' ' || char === '\r' || char === '\n' || char === '\t') {
      payloadEnd = i;
      break;
    }
  }

  // Verify that everything after the base64 payload is trailing whitespace
  // to ensure this is a valid trailing sourceMappingURL comment at the end of the file.
  for (let i = payloadEnd; i < urlLine.length; i++) {
    const char = urlLine[i];
    if (char !== ' ' && char !== '\r' && char !== '\n' && char !== '\t') {
      return undefined;
    }
  }

  return urlLine.slice(payloadStart, payloadEnd);
}

/**
 * Extracts the URL from an external sourcemap comment line and verifies
 * that only trailing whitespace follows the URL.
 *
 * @returns The URL string if valid and trailing, or `undefined` otherwise.
 */
function extractTrailingUrl(urlLine: string): string | undefined {
  if (urlLine.startsWith('data:')) {
    return undefined;
  }

  const urlMatch = /^([^\r\n\s'"`]+)/.exec(urlLine);
  if (!urlMatch) {
    return undefined;
  }

  const remaining = urlLine.slice(urlMatch[1].length);
  if (!/^\s*$/.test(remaining)) {
    return undefined;
  }

  return urlMatch[1];
}

/**
 * Checks whether a `//# sourceMappingURL=` URL line snippet represents a valid trailing comment at the end of the file.
 */
export function isTrailingSourceMapComment(urlLine: string): boolean {
  return (
    extractTrailingBase64Payload(urlLine) !== undefined || extractTrailingUrl(urlLine) !== undefined
  );
}

/**
 * Resolves and loads the input sourcemap referenced in a `//# sourceMappingURL=` URL line snippet.
 * Supports inline base64 data URIs, local absolute file URLs, and relative/absolute filesystem paths.
 */
export function loadInputSourceMapFromUrl(
  filename: string,
  urlLine: string,
): EncodedSourceMap | undefined {
  // Inline base64-encoded sourcemaps can be extremely large (up to megabytes).
  // Parse them without regular expressions to avoid heavy backtracking and allocations.
  const base64Payload = extractTrailingBase64Payload(urlLine);
  if (base64Payload !== undefined) {
    try {
      return JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8')) as EncodedSourceMap;
    } catch {
      return undefined;
    }
  }

  const url = extractTrailingUrl(urlLine);
  if (!url) {
    return undefined;
  }

  if (url.startsWith('file://')) {
    // Local absolute file URL scheme.
    try {
      const mapPath = fileURLToPath(url);
      if (existsSync(mapPath)) {
        return JSON.parse(readFileSync(mapPath, 'utf8')) as EncodedSourceMap;
      }
    } catch {}
  } else if (!/^[a-z]+:\/\//i.test(url)) {
    // Local relative or absolute filesystem path (percent-decoded as it originates from a URI).
    try {
      const mapPath = resolve(dirname(filename), decodeURIComponent(url));
      if (existsSync(mapPath)) {
        return JSON.parse(readFileSync(mapPath, 'utf8')) as EncodedSourceMap;
      }
    } catch {}
  }

  return undefined;
}

/**
 * Finds, resolves, and loads the input sourcemap referenced in the code's trailing
 * sourceMappingURL comment, if present. Supports inline base64 data URIs, local absolute
 * file URLs, and relative/absolute filesystem paths.
 */
export function loadInputSourceMap(filename: string, code: string): EncodedSourceMap | undefined {
  // Locate the last sourceMappingURL comment using lastIndexOf to avoid scanning
  // the entire file with a regular expression (significant for large files).
  const lastSourceMapIndex = code.lastIndexOf('//# sourceMappingURL=');
  if (lastSourceMapIndex === -1) {
    return undefined;
  }

  if (lastSourceMapIndex > 0) {
    // Skip any preceding horizontal whitespace (spaces/tabs) to find the start of the line.
    let prevIdx = lastSourceMapIndex - 1;
    while (prevIdx >= 0 && (code[prevIdx] === ' ' || code[prevIdx] === '\t')) {
      prevIdx--;
    }
    // Ensure the comment starts at the beginning of a line, preventing false positives within code or strings.
    if (prevIdx >= 0 && code[prevIdx] !== '\n' && code[prevIdx] !== '\r') {
      return undefined;
    }
  }

  return loadInputSourceMapFromUrl(filename, code.slice(lastSourceMapIndex + 21));
}
