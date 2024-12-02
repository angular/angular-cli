/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createReadStream } from 'node:fs';
import { normalize } from 'node:path';
import { Parser } from 'tar';

/**
 * Extract and return the contents of a single file out of a tar file.
 *
 * @param tarball the tar file to extract from
 * @param filePath the path of the file to extract
 * @returns the Buffer of file or an error on fs/tar error or file not found
 */
export function extractFile(tarball: string, filePath: string): Promise<Buffer> {
  const normalizedFilePath = normalize(filePath);

  return new Promise((resolve, reject) => {
    createReadStream(tarball)
      .pipe(
        new Parser({
          strict: true,
          filter: (p) => normalize(p) === normalizedFilePath,
          onReadEntry: (entry) => {
            const chunks: Buffer[] = [];

            entry.on('data', (chunk) => chunks.push(chunk));
            entry.on('error', reject);
            entry.on('finish', () => resolve(Buffer.concat(chunks)));
          },
        }),
      )
      .on('close', () => reject(`${tarball} does not contain ${filePath}`));
  });
}
