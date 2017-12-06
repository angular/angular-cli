/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { UnsupportedPlatformException } from '../../exception/exception';
import { FileBuffer } from './interface';

export function stringToFileBuffer(str: string): FileBuffer {
  // If we're in Node...
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    const buf = Buffer.from(str);
    const ab = new ArrayBuffer(buf.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
    }

    return ab;
  }

  throw new UnsupportedPlatformException();
}
