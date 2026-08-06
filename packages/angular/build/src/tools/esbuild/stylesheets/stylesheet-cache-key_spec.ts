/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { initializeHash } from '../../../utils/hash';
import type { BundleStylesheetOptions } from './bundle-options';
import { calculateGlobalStylesheetConfigHash } from './stylesheet-cache-key';

describe('Stylesheet Global Config Hash', () => {
  beforeAll(async () => {
    await initializeHash();
  });

  const baseOptions: BundleStylesheetOptions = {
    workspaceRoot: '/root',
    optimization: true,
    inlineFonts: false,
    sourcemap: true,
    outputNames: { bundles: 'styles', media: 'media' },
    target: ['chrome100'],
    cacheOptions: { enabled: true, path: '/cache', basePath: '/root' },
  };

  describe('calculateGlobalStylesheetConfigHash', () => {
    it('should generate consistent hashes for identical options', () => {
      const hash1 = calculateGlobalStylesheetConfigHash(baseOptions, '1.0.0');
      const hash2 = calculateGlobalStylesheetConfigHash({ ...baseOptions }, '1.0.0');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes when optimization changes', () => {
      const hash1 = calculateGlobalStylesheetConfigHash(baseOptions, '1.0.0');
      const hash2 = calculateGlobalStylesheetConfigHash(
        { ...baseOptions, optimization: false },
        '1.0.0',
      );
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes when sourcemap options change', () => {
      const hash1 = calculateGlobalStylesheetConfigHash(baseOptions, '1.0.0');
      const hash2 = calculateGlobalStylesheetConfigHash(
        { ...baseOptions, sourcemap: false },
        '1.0.0',
      );
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes when sourcesContent changes', () => {
      const hash1 = calculateGlobalStylesheetConfigHash(
        { ...baseOptions, sourcesContent: true },
        '1.0.0',
      );
      const hash2 = calculateGlobalStylesheetConfigHash(
        { ...baseOptions, sourcesContent: false },
        '1.0.0',
      );
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes when target browsers change', () => {
      const hash1 = calculateGlobalStylesheetConfigHash(baseOptions, '1.0.0');
      const hash2 = calculateGlobalStylesheetConfigHash(
        { ...baseOptions, target: ['firefox90'] },
        '1.0.0',
      );
      expect(hash1).not.toBe(hash2);
    });
  });
});
