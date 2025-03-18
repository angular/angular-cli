/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Resolve paths for the Beasties license file and the golden reference file.
 */
const ANGULAR_SSR_PACKAGE_PATH = resolve('../../npm_package');

/**
 * Path to the actual license file for the Beasties library.
 * This file is located in the `third_party/beasties` directory of the Angular CLI npm package.
 */
const CRITTERS_ACTUAL_LICENSE_FILE_PATH = join(
  ANGULAR_SSR_PACKAGE_PATH,
  'third_party/beasties/THIRD_PARTY_LICENSES.txt',
);

describe('NPM Package Tests', () => {
  it('should not include the contents of third_party/beasties/index.js in the FESM bundle', async () => {
    const fesmFilePath = join(ANGULAR_SSR_PACKAGE_PATH, 'fesm2022/ssr.mjs');
    const fesmContent = await readFile(fesmFilePath, 'utf-8');
    expect(fesmContent).toContain(`import Beasties from '../third_party/beasties/index.js'`);
  });

  describe('third_party/beasties/THIRD_PARTY_LICENSES.txt', () => {
    it('should exist', () => {
      expect(existsSync(CRITTERS_ACTUAL_LICENSE_FILE_PATH)).toBe(true);
    });
  });
});
