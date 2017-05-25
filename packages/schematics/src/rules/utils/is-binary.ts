/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export function isBinary(buffer: Buffer): boolean {
  const chunkLength = 24;
  const chunkBegin = 0;

  const chunkEnd = Math.min(buffer.length, chunkBegin + chunkLength);
  const contentChunkUTF8 = buffer.toString('utf-8', chunkBegin, chunkEnd);

  // Detect encoding
  for ( let i = 0; i < contentChunkUTF8.length; ++i ) {
    const charCode = contentChunkUTF8.charCodeAt(i);
    if ( charCode === 65533 || charCode <= 8 ) {
      // 8 and below are control characters (e.g. backspace, null, eof, etc.).
      // 65533 is the unknown character.
      return true;
    }
  }

  // Return
  return false;
}
