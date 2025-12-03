/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createReadStream } from 'node:fs';
import { normalize } from 'node:path';
import { createGunzip } from 'node:zlib';
import { extract } from 'tar-stream';

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
    const extractor = extract();

    extractor.on('entry', (header, stream, next) => {
      if (normalize(header.name) !== normalizedFilePath) {
        stream.resume();
        next();

        return;
      }

      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
        next();
      });
    });

    extractor.on('finish', () => reject(new Error(`'${filePath}' not found in '${tarball}'.`)));

    createReadStream(tarball).pipe(createGunzip()).pipe(extractor).on('error', reject);
  });
}
