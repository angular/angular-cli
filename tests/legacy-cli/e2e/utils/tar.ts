/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import fs from 'fs';
import { normalize } from 'path';
import { Parse } from 'tar';

/**
 * Extract and return the contents of a single file out of a tar file.
 *
 * @param tarball the tar file to extract from
 * @param filePath the path of the file to extract
 * @returns the Buffer of file or an error on fs/tar error or file not found
 */
export async function extractFile(tarball: string, filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(tarball)
      .pipe(
        new Parse({
          strict: true,
          filter: (p) => normalize(p) === normalize(filePath),
          // TODO: @types/tar 'entry' does not have ReadEntry.on
          onentry: (entry: any) => {
            const chunks: Buffer[] = [];

            entry.on('data', (chunk: any) => chunks!.push(chunk));
            entry.on('error', reject);
            entry.on('finish', () => resolve(Buffer.concat(chunks!)));
          },
        }),
      )
      .on('close', () => reject(`${tarball} does not contain ${filePath}`));
  });
}
