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

export const SOURCEMAP_COMMENT_PREFIX = '//# sourceMappingURL=';
export const SOURCEMAP_COMMENT_BYTES = Buffer.from(SOURCEMAP_COMMENT_PREFIX);

/**
 * Checks for a single trailing `//# sourceMappingURL=` comment on a raw buffer.
 *
 * @param data The raw byte buffer to inspect.
 * @returns An object containing the sliced code buffer and URL snippet if a single trailing comment exists,
 *          `null` if no sourcemap comment exists in the buffer, or `undefined` if multiple/non-trailing comments exist.
 */
export function findTrailingSourceMapComment(
  data: Uint8Array,
): { code: Uint8Array; urlLine: string } | null | undefined {
  const dataBuffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.buffer, data.byteOffset, data.byteLength);

  const firstIndex = dataBuffer.indexOf(SOURCEMAP_COMMENT_BYTES);
  if (firstIndex === -1) {
    return null;
  }

  const lastIndex = dataBuffer.lastIndexOf(SOURCEMAP_COMMENT_BYTES);
  // Skip any preceding horizontal whitespace (spaces/tabs) to find the start of the line.
  let prevIdx = lastIndex - 1;
  while (prevIdx >= 0 && (dataBuffer[prevIdx] === 32 || dataBuffer[prevIdx] === 9)) {
    prevIdx--;
  }
  // Ensure the comment starts at the beginning of a line or the start of the file,
  // preventing false positives for occurrences inside inline string literals or code.
  const isLineStart = prevIdx < 0 || dataBuffer[prevIdx] === 10 || dataBuffer[prevIdx] === 13;

  if (firstIndex === lastIndex && isLineStart) {
    const urlLine = dataBuffer
      .subarray(lastIndex + SOURCEMAP_COMMENT_BYTES.length)
      .toString('utf-8');

    return {
      code: dataBuffer.subarray(0, prevIdx < 0 ? 0 : prevIdx + 1),
      urlLine,
    };
  }

  return undefined;
}

/**
 * Removes `//# sourceMappingURL=` comments safely from the given JavaScript code,
 * ignoring any occurrences that are inside string literals, template literals, regex literals,
 * or block comments.
 *
 * For raw Uint8Array / Buffer inputs, it optimizes performance by inspecting trailing byte sequences
 * to slice the buffer directly without full string decoding.
 *
 * @param code The JavaScript source code as a string or Uint8Array.
 * @returns The code with top-level sourcemap comments removed.
 */
export function removeSourceMappingURL(code: string): string;
export function removeSourceMappingURL(code: Uint8Array): Uint8Array;
export function removeSourceMappingURL(code: string | Uint8Array): string | Uint8Array {
  if (typeof code === 'string') {
    return removeSourceMappingURLFromString(code);
  }

  const trailing = findTrailingSourceMapComment(code);
  if (trailing === null) {
    return code;
  }

  if (trailing && isTrailingSourceMapComment(trailing.urlLine)) {
    return trailing.code;
  }

  // Fallback to full decode and state-machine stripping for multiple comments or non-trailing comments
  const dataBuffer = Buffer.isBuffer(code)
    ? code
    : Buffer.from(code.buffer, code.byteOffset, code.byteLength);
  const text = dataBuffer.toString('utf-8');
  const stripped = removeSourceMappingURLFromString(text);

  return stripped === text ? code : Buffer.from(stripped, 'utf-8');
}

const REGEX_PRECEDING_KEYWORDS = new Set([
  'await',
  'case',
  'default',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);

const REGEX_PRECEDING_PUNCTUATION = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '~',
  '^',
  '<',
  '>',
  '/',
]);

function isIdentifierChar(char: string): boolean {
  const code = char.charCodeAt(0);

  return (
    (code >= 97 && code <= 122) || // a-z
    (code >= 65 && code <= 90) || // A-Z
    (code >= 48 && code <= 57) || // 0-9
    code === 95 || // _
    code === 36 || // $
    code > 127 // Unicode / non-ASCII
  );
}

function consumeIdentifier(
  code: string,
  start: number,
): { nextIndex: number; regexAllowed: boolean } {
  const len = code.length;
  let i = start + 1;
  while (i < len && isIdentifierChar(code[i])) {
    i++;
  }
  const word = code.slice(start, i);
  let prevIdx = start - 1;
  while (
    prevIdx >= 0 &&
    (code[prevIdx] === ' ' ||
      code[prevIdx] === '\t' ||
      code[prevIdx] === '\n' ||
      code[prevIdx] === '\r')
  ) {
    prevIdx--;
  }
  const regexAllowed =
    (prevIdx < 0 || code[prevIdx] !== '.') && REGEX_PRECEDING_KEYWORDS.has(word);

  return { nextIndex: i, regexAllowed };
}

function consumeRegexLiteral(
  code: string,
  start: number,
): { nextIndex: number; regexAllowed: boolean } {
  const len = code.length;
  let i = start;
  let inCharClass = false;

  while (i < len) {
    const char = code[i];
    if (char === '\\') {
      const nextChar = code[i + 1];
      if (nextChar === '\n' || nextChar === '\r') {
        return { nextIndex: i + 2, regexAllowed: true };
      }
      i += 2;
      continue;
    }
    if (char === '\n' || char === '\r') {
      return { nextIndex: i + 1, regexAllowed: true };
    }
    if (char === '[') {
      inCharClass = true;
    } else if (char === ']' && inCharClass) {
      inCharClass = false;
    } else if (char === '/' && !inCharClass) {
      return { nextIndex: i + 1, regexAllowed: false };
    }
    i++;
  }

  return { nextIndex: len, regexAllowed: false };
}

function removeSourceMappingURLFromString(code: string): string {
  if (!code.includes(SOURCEMAP_COMMENT_PREFIX)) {
    return code;
  }

  const result: string[] = [];
  let lastCopiedIndex = 0;
  let i = 0;
  const len = code.length;

  // Stack to track template literal state and curly brace depth for nested interpolations.
  const stack: { type: 'template'; braceDepth: number }[] = [];
  let currentState:
    | 'normal'
    | 'string_double'
    | 'string_single'
    | 'template'
    | 'comment_block'
    | 'comment_line' = 'normal';
  let regexAllowed = true;

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
        if (code.startsWith(SOURCEMAP_COMMENT_PREFIX, i)) {
          if (i > lastCopiedIndex) {
            result.push(code.slice(lastCopiedIndex, i));
          }
          // Skip the rest of the comment line up to the newline
          i += SOURCEMAP_COMMENT_PREFIX.length;
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
        regexAllowed = false;
        i++;
        continue;
      }
      if (char === "'") {
        currentState = 'string_single';
        regexAllowed = false;
        i++;
        continue;
      }
      if (char === '`') {
        currentState = 'template';
        stack.push({ type: 'template', braceDepth: 0 });
        regexAllowed = false;
        i++;
        continue;
      }
      if (char === '{') {
        const top = stack[stack.length - 1];
        if (top) {
          top.braceDepth++;
        }
        regexAllowed = true;
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
            regexAllowed = false;
            i++;
            continue;
          }
        }
        regexAllowed = true;
        i++;
        continue;
      }
      if ((char === '+' && nextChar === '+') || (char === '-' && nextChar === '-')) {
        regexAllowed = false;
        i += 2;
        continue;
      }
      if (char === '/') {
        if (regexAllowed) {
          ({ nextIndex: i, regexAllowed } = consumeRegexLiteral(code, i + 1));
        } else {
          regexAllowed = true;
          i++;
        }
        continue;
      }
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        i++;
        continue;
      }
      if (isIdentifierChar(char)) {
        ({ nextIndex: i, regexAllowed } = consumeIdentifier(code, i));
        continue;
      }

      regexAllowed = REGEX_PRECEDING_PUNCTUATION.has(char);
      i++;
    } else if (currentState === 'string_double') {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === '"') {
        currentState = 'normal';
        regexAllowed = false;
      }
      i++;
    } else if (currentState === 'string_single') {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === "'") {
        currentState = 'normal';
        regexAllowed = false;
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
        regexAllowed = true;
        i += 2;
        continue;
      }
      if (char === '`') {
        stack.pop();
        currentState = 'normal';
        regexAllowed = false;
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
  const lastSourceMapIndex = code.lastIndexOf(SOURCEMAP_COMMENT_PREFIX);
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

  return loadInputSourceMapFromUrl(
    filename,
    code.slice(lastSourceMapIndex + SOURCEMAP_COMMENT_PREFIX.length),
  );
}
