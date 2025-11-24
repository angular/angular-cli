/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Escapes a search query for FTS5 by tokenizing and quoting terms.
 *
 * This function processes a raw search string and prepares it for an FTS5 full-text search.
 * It correctly handles quoted phrases, logical operators (AND, OR, NOT), parentheses,
 * and prefix searches (ending with an asterisk), ensuring that individual search
 * terms are properly quoted to be treated as literals by the search engine.
 * This is primarily intended to avoid unintentional usage of FTS5 query syntax by consumers.
 *
 * @param query The raw search query string.
 * @returns A sanitized query string suitable for FTS5.
 */
export function escapeSearchQuery(query: string): string {
  // This regex tokenizes the query string into parts:
  // 1. Quoted phrases (e.g., "foo bar")
  // 2. Parentheses ( and )
  // 3. FTS5 operators (AND, OR, NOT, NEAR)
  // 4. Words, which can include a trailing asterisk for prefix search (e.g., foo*)
  const tokenizer = /"([^"]*)"|([()])|\b(AND|OR|NOT|NEAR)\b|([^\s()]+)/g;
  let match;
  const result: string[] = [];
  let lastIndex = 0;

  while ((match = tokenizer.exec(query)) !== null) {
    // Add any whitespace or other characters between tokens
    if (match.index > lastIndex) {
      result.push(query.substring(lastIndex, match.index));
    }

    const [, quoted, parenthesis, operator, term] = match;

    if (quoted !== undefined) {
      // It's a quoted phrase, keep it as is.
      result.push(`"${quoted}"`);
    } else if (parenthesis) {
      // It's a parenthesis, keep it as is.
      result.push(parenthesis);
    } else if (operator) {
      // It's an operator, keep it as is.
      result.push(operator);
    } else if (term) {
      // It's a term that needs to be quoted.
      if (term.endsWith('*')) {
        result.push(`"${term.slice(0, -1)}"*`);
      } else {
        result.push(`"${term}"`);
      }
    }
    lastIndex = tokenizer.lastIndex;
  }

  // Add any remaining part of the string
  if (lastIndex < query.length) {
    result.push(query.substring(lastIndex));
  }

  return result.join('');
}
