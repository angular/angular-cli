/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

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
