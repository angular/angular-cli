/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
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
export async function extractFile(tarball: string, filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parser = new Parser({
      strict: true,
      filter: (p) => normalize(p) === normalize(filePath),
      onentry: (entry) => {
        const chunks: Buffer[] = [];

        entry.on('data', (chunk: any) => chunks!.push(chunk));
        entry.on('error', reject);
        entry.on('finish', () => resolve(Buffer.concat(chunks!)));
      },
    });

    createReadStream(tarball)
      // The types returned by 'write(...)' are incompatible between these types.
      .pipe(parser as any)
      .on('close', () => reject(`${tarball} does not contain ${filePath}`));
  });
}
