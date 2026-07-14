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
  const result: string[] = [];
  let i = 0;
  const len = code.length;

  // Stack to track template literal state and curly brace depth for nested interpolations.
  const stack: { type: 'template'; braceDepth: number }[] = [];
  let currentState:
    'normal' | 'string_double' | 'string_single' | 'template' | 'comment_block' | 'comment_line' =
    'normal';
  let isStrippingComment = false;

  while (i < len) {
    const char = code[i];
    const nextChar = code[i + 1];

    if (currentState === 'normal') {
      if (char === '/' && nextChar === '*') {
        currentState = 'comment_block';
        result.push('/*');
        i += 2;
        continue;
      }
      if (char === '/' && nextChar === '/') {
        // Detect if the comment is escaped (e.g. inside a regex literal like `/\/\/#/`).
        let isEscaped = false;
        let prevIdx = result.length - 1;
        while (prevIdx >= 0 && /\s/.test(result[prevIdx])) {
          prevIdx--;
        }
        if (prevIdx >= 0 && result[prevIdx] === '\\') {
          let bsCount = 0;
          while (prevIdx >= 0 && result[prevIdx] === '\\') {
            bsCount++;
            prevIdx--;
          }
          if (bsCount % 2 === 1) {
            isEscaped = true;
          }
        }

        if (!isEscaped && code.startsWith('//# sourceMappingURL=', i)) {
          currentState = 'comment_line';
          isStrippingComment = true;
          i += 21; // Skip the '//# sourceMappingURL=' prefix
          continue;
        } else {
          currentState = 'comment_line';
          isStrippingComment = false;
          result.push('//');
          i += 2;
          continue;
        }
      }
      if (char === '"') {
        currentState = 'string_double';
        result.push('"');
        i++;
        continue;
      }
      if (char === "'") {
        currentState = 'string_single';
        result.push("'");
        i++;
        continue;
      }
      if (char === '`') {
        currentState = 'template';
        stack.push({ type: 'template', braceDepth: 0 });
        result.push('`');
        i++;
        continue;
      }
      if (char === '{') {
        const top = stack[stack.length - 1];
        if (top) {
          top.braceDepth++;
        }
        result.push('{');
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
            result.push('}');
            i++;
            continue;
          }
        }
        result.push('}');
        i++;
        continue;
      }

      result.push(char);
      i++;
    } else if (currentState === 'string_double') {
      if (char === '\\') {
        result.push(char, nextChar || '');
        i += 2;
        continue;
      }
      if (char === '"') {
        currentState = 'normal';
      }
      result.push(char);
      i++;
    } else if (currentState === 'string_single') {
      if (char === '\\') {
        result.push(char, nextChar || '');
        i += 2;
        continue;
      }
      if (char === "'") {
        currentState = 'normal';
      }
      result.push(char);
      i++;
    } else if (currentState === 'template') {
      if (char === '\\') {
        result.push(char, nextChar || '');
        i += 2;
        continue;
      }
      if (char === '$' && nextChar === '{') {
        // Entering template literal interpolation context
        currentState = 'normal';
        stack.push({ type: 'template', braceDepth: 0 });
        result.push('${');
        i += 2;
        continue;
      }
      if (char === '`') {
        stack.pop();
        currentState = 'normal';
      }
      result.push(char);
      i++;
    } else if (currentState === 'comment_block') {
      if (char === '*' && nextChar === '/') {
        currentState = 'normal';
        result.push('*/');
        i += 2;
        continue;
      }
      result.push(char);
      i++;
    } else if (currentState === 'comment_line') {
      if (char === '\n' || char === '\r') {
        currentState = 'normal';
        isStrippingComment = false;
        result.push(char);
        i++;
        continue;
      }
      if (!isStrippingComment) {
        result.push(char);
      }
      i++;
    }
  }

  return result.join('');
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

  const urlLine = code.slice(lastSourceMapIndex + 21);

  // Inline base64-encoded sourcemaps can be extremely large (up to megabytes).
  // Parse them without regular expressions to avoid heavy backtracking and allocations.
  if (urlLine.startsWith('data:application/json;')) {
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

    try {
      // Extract the base64 payload and decode it directly into binary memory.
      const base64Content = urlLine.slice(payloadStart, payloadEnd);

      return JSON.parse(Buffer.from(base64Content, 'base64').toString('utf-8')) as EncodedSourceMap;
    } catch {
      return undefined;
    }
  }

  // Non-inline sourcemap comments (always small, typically < 200 characters).
  const urlMatch = /^([^\r\n\s]+)/.exec(urlLine);
  if (!urlMatch) {
    return undefined;
  }

  const url = urlMatch[1];
  const remaining = urlLine.slice(url.length);
  // Verify there is only whitespace after the URL to the end of the file.
  if (!/^\s*$/.test(remaining)) {
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
