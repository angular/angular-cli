/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { ResourceLoader } from '@angular/compiler';

/** ResourceLoader implementation for loading files */
export class FileLoader implements ResourceLoader {
  get(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(url, (err: NodeJS.ErrnoException | null, data: Buffer) => {
        if (err) {
          return reject(err);
        }

        resolve(data.toString());
      });
    });
  }
}
