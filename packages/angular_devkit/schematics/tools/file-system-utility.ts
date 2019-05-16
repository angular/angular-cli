/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  FileDoesNotExistException,
  JsonParseMode,
  JsonValue,
  parseJson,
} from '@angular-devkit/core';
import { existsSync, readFileSync } from 'fs';


/**
 * Read a file and returns its content. This supports different file encoding.
 */
export function readFile(fileName: string): string {
  if (!existsSync(fileName)) {
    throw new FileDoesNotExistException(fileName);
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


export function readJsonFile(path: string): JsonValue {
  return parseJson(readFile(path), JsonParseMode.Loose);
}
