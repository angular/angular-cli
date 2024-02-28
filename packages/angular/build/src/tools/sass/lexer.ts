/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: Combine everything into a single pass lexer

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
 * Scans a CSS or Sass file and locates all valid url function values as defined by the
 * syntax specification.
 * @param contents A string containing a CSS or Sass file to scan.
 * @returns An iterable that yields each CSS url function value found.
 */
export function* findUrls(
  contents: string,
): Iterable<{ start: number; end: number; value: string }> {
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
  while ((pos = contents.indexOf('url(', pos)) !== -1) {
    // Set to position of the (
    pos += 3;
    width = 1;

    // Consume all leading whitespace
    while (isWhitespace(next())) {
      /* empty */
    }

    // Initialize URL state
    const url = { start: pos, end: -1, value: '' };
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
                url.value += String.fromCodePoint(current);
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
            url.value += String.fromCodePoint(current);
            break;
        }
      }

      next();
      continue;
    }

    // Based on https://www.w3.org/TR/css-syntax-3/#consume-url-token
    while (!complete) {
      switch (current) {
        case -1: // EOF
          return;
        case 0x0022: // "
        case 0x0027: // '
        case 0x0028: // (
          // Invalid
          complete = true;
          break;
        case 0x0029: // )
          // URL is valid and complete
          url.end = pos;
          complete = true;
          break;
        case 0x005c: // \ -- character escape
          // If not EOF or newline, add the character after the escape
          switch (next()) {
            case -1: // EOF
              return;
            case 0x000a: // line feed
            case 0x000c: // form feed
            case 0x000d: // carriage return
              // Invalid
              complete = true;
              break;
            default:
              // TODO: Handle hex escape codes
              url.value += String.fromCodePoint(current);
              break;
          }
          break;
        default:
          if (isWhitespace(current)) {
            while (isWhitespace(next())) {
              /* empty */
            }
            // Unescaped whitespace is only valid before the closing )
            if (current === 0x0029) {
              // URL is valid
              url.end = pos;
            }
            complete = true;
          } else {
            // Add the character to the url value
            url.value += String.fromCodePoint(current);
          }
          break;
      }
      next();
    }

    // An end position indicates a URL was found
    if (url.end !== -1) {
      yield url;
    }
  }
}
