/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ResourceLoader } from '@angular/compiler';
import { readFile } from './utils';

/** ResourceLoader implementation for loading files */
export class FileLoader implements ResourceLoader {
  get(url: string): Promise<string> {
    return readFile(url, 'utf-8');
  }
}
