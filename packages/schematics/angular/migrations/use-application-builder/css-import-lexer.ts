/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Determines if a unicode code point is a CSS whitespace character.
 * @param code The unicode code point to test.
 * @returns true, if the code point is CSS whitespace; false, otherwise.
 */
function isWhitespace(code: number): boolean {
  // Based on https://www.w3.org/TR/css-syntax-3/#whitespace
  switch (code) {
    case 0x0009: // tab
    case 0x0020: // space
    case 0x000a: // line feed
    case 0x000c: // form feed
    case 0x000d: // carriage return
      return true;
    default:
      return false;
  }
}

/**
 * Scans a CSS or Sass file and locates all valid import/use directive values as defined by the
 * syntax specification.
 * @param contents A string containing a CSS or Sass file to scan.
 * @returns An iterable that yields each CSS directive value found.
 */
export function* findImports(
  contents: string,
  sass: boolean,
): Iterable<{ start: number; end: number; specifier: string; fromUse?: boolean }> {
  yield* find(contents, '@import ');
  if (sass) {
    for (const result of find(contents, '@use ')) {
      yield { ...result, fromUse: true };
    }
  }
}

/**
 * Scans a CSS or Sass file and locates all valid function/directive values as defined by the
 * syntax specification.
 * @param contents A string containing a CSS or Sass file to scan.
 * @param prefix The prefix to start a valid segment.
 * @returns An iterable that yields each CSS url function value found.
 */
function* find(
  contents: string,
  prefix: string,
): Iterable<{ start: number; end: number; specifier: string }> {
  let pos = 0;
  let width = 1;
  let current = -1;
  const next = () => {
    pos += width;
    current = contents.codePointAt(pos) ?? -1;
    width = current > 0xffff ? 2 : 1;

    return current;
  };

  // Based on https://www.w3.org/TR/css-syntax-3/#consume-ident-like-token
  while ((pos = contents.indexOf(prefix, pos)) !== -1) {
    // Set to position of the last character in prefix
    pos += prefix.length - 1;
    width = 1;

    // Consume all leading whitespace
    while (isWhitespace(next())) {
      /* empty */
    }

    // Initialize URL state
    const url = { start: pos, end: -1, specifier: '' };
    let complete = false;

    // If " or ', then consume the value as a string
    if (current === 0x0022 || current === 0x0027) {
      const ending = current;
      // Based on https://www.w3.org/TR/css-syntax-3/#consume-string-token
      while (!complete) {
        switch (next()) {
          case -1: // EOF
            return;
          case 0x000a: // line feed
          case 0x000c: // form feed
          case 0x000d: // carriage return
            // Invalid
            complete = true;
            break;
          case 0x005c: // \ -- character escape
            // If not EOF or newline, add the character after the escape
            switch (next()) {
              case -1:
                return;
              case 0x000a: // line feed
              case 0x000c: // form feed
              case 0x000d: // carriage return
                // Skip when inside a string
                break;
              default:
                // TODO: Handle hex escape codes
                url.specifier += String.fromCodePoint(current);
                break;
            }
            break;
          case ending:
            // Full string position should include the quotes for replacement
            url.end = pos + 1;
            complete = true;
            yield url;
            break;
          default:
            url.specifier += String.fromCodePoint(current);
            break;
        }
      }

      next();
      continue;
    }
  }
}
