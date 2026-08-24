/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const IMPORT_EXEC_ARGV =
  '--import=' + pathToFileURL(join(__dirname, 'register-hooks.js')).href;

/**
 * Creates a shared zero-copy `Uint8Array` backed by a `SharedArrayBuffer` for the given file content.
 */
export function createSharedFile(content: string | Uint8Array): Uint8Array {
  if (typeof content === 'string') {
    const byteLength = Buffer.byteLength(content, 'utf-8');
    const sab = new SharedArrayBuffer(byteLength);
    Buffer.from(sab).write(content, 'utf-8');

    return new Uint8Array(sab);
  }

  if (content.buffer instanceof SharedArrayBuffer) {
    return content;
  }

  const sab = new SharedArrayBuffer(content.byteLength);
  const view = new Uint8Array(sab);
  view.set(content);

  return view;
}

/**
 * Creates shared zero-copy `Uint8Array` views backed by `SharedArrayBuffer` for all output files.
 */
export function createSharedServerFiles(
  outputFiles: Record<string, string | Uint8Array>,
): Record<string, Uint8Array> {
  const sharedFiles: Record<string, Uint8Array> = {};

  for (const [key, value] of Object.entries(outputFiles)) {
    sharedFiles[key] = createSharedFile(value);
  }

  return sharedFiles;
}
