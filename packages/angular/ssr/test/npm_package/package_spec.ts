/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createPatch } from 'diff';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ANGULAR_SSR_PACKAGE_PATH,
  CRITTERS_ACTUAL_LICENSE_FILE_PATH,
  CRITTERS_GOLDEN_LICENSE_FILE_PATH,
} from './utils';

describe('NPM Package Tests', () => {
  it('should not include the contents of third_party/critters/index.js in the FESM bundle', async () => {
    const fesmFilePath = join(ANGULAR_SSR_PACKAGE_PATH, 'fesm2022/ssr.mjs');
    const fesmContent = await readFile(fesmFilePath, 'utf-8');
    expect(fesmContent).toContain(`import Critters from '../third_party/critters/index.js'`);
  });

  describe('third_party/critters/THIRD_PARTY_LICENSES.txt', () => {
    it('should exist', () => {
      expect(existsSync(CRITTERS_ACTUAL_LICENSE_FILE_PATH)).toBe(true);
    });

    it('should match the expected golden file', async () => {
      const [expectedContent, actualContent] = await Promise.all([
        readFile(CRITTERS_GOLDEN_LICENSE_FILE_PATH, 'utf-8'),
        readFile(CRITTERS_ACTUAL_LICENSE_FILE_PATH, 'utf-8'),
      ]);

      if (expectedContent.trim() === actualContent.trim()) {
        return;
      }

      const patch = createPatch(
        CRITTERS_GOLDEN_LICENSE_FILE_PATH,
        expectedContent,
        actualContent,
        'Golden License File',
        'Current License File',
        { context: 5 },
      );

      const errorMessage = `The content of the actual license file differs from the expected golden reference.
      Diff:
      ${patch}
      To accept the new golden file, execute:
        yarn bazel run ${process.env['BAZEL_TARGET']}.accept
    `;

      const error = new Error(errorMessage);
      error.stack = error.stack?.replace(`      Diff:\n      ${patch}`, '');
      throw error;
    });
  });
});
