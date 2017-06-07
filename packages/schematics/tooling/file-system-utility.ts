/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {existsSync, readFileSync} from 'fs';


/**
 * Read a file and returns its content. This supports different file encoding.
 */
export function readFile(fileName: string): string | null {
  if (!existsSync(fileName)) {
    return null;
  }
  const buffer = readFileSync(fileName);
  let len = buffer.length;
  if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
    // flip all byte pairs and treat as little endian.
    len &= ~1;
    for (let i = 0; i < len; i += 2) {
      const temp = buffer[i];
      buffer[i] = buffer[i + 1];
      buffer[i + 1] = temp;
    }
    return buffer.toString('utf16le', 2);
  }
  if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    // Little endian UTF-16 byte order mark detected
    return buffer.toString('utf16le', 2);
  }
  if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    // UTF-8 byte order mark detected
    return buffer.toString('utf8', 3);
  }
  // Default is UTF-8 with no byte order mark
  return buffer.toString('utf8');
}


/**
 * Parse a JSON string and optionally remove comments from it first.
 */
export function parseJson(content: string, stripComments = true): any {
  if (stripComments) {
    // Simple parser to ignore strings.
    let inString = false;
    for (let i = 0; i < content.length; i++) {
      if (inString) {
        // Skip `\X` characters. Since we only care about \", we don't need to fully process valid
        // escape sequences (e.g. unicode sequences). This algorithm could accept invalid sequences
        // but the JSON.parse call will throw on those so the output of the whole function will
        // still be valid.
        switch (content[i]) {
          case '\\': i++; break;
          case '"': inString = false; break;
          // Else ignore characters.
        }
      } else {
        switch (content[i]) {
          case '"': inString = true; break;
          case '/':
            let j = 0;
            switch (content[i + 1]) {
              case '/':  // Strip until end-of-line.
                for (j = i + 2; j < content.length; j++) {
                  if (content[j] == '\n' || content[j] == '\r') {
                    break;
                  }
                }
                break;
              case '*':  // Strip until `*/`.
                for (j = i + 2; j < content.length; j++) {
                  if (content[j - 1] == '*' && content[j] == '/') {
                    break;
                  }
                }
                break;
            }
            if (j) {
              // Use `j + 1` to skip the end-of-comment character.
              content = content.substr(0, i) + content.substr(j + 1);
              i--;
            }
            break;
        }
      }
    }
    // At this point we don't really care about the validity of the resulting string, since
    // JSON.parse will validate the JSON itself.
  }

  return JSON.parse(content);
}


export function readJsonFile(path: string): any {
  return parseJson(readFile(path) || '{}');
}
