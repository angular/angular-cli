/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getSupportedNodeTargets, transformSupportedBrowsersToTargets } from './target';

describe('esbuild target', () => {
  describe('transformSupportedBrowsersToTargets', () => {
    it('should return the smallest version for each browser', () => {
      const targets = transformSupportedBrowsersToTargets([
        'chrome 122',
        'chrome 120',
        'chrome 121',
        'firefox 116',
        'firefox 115',
        'safari 17.0',
        'safari 16.4',
      ]);

      expect(targets).toEqual(['chrome120.0', 'firefox115.0', 'safari16.4']);
    });

    it('should handle version ranges and pick the lowest version', () => {
      const targets = transformSupportedBrowsersToTargets([
        'ios_saf 15.4',
        'ios_saf 15.2-15.3',
        'ios_saf 16.0',
      ]);

      expect(targets).toEqual(['ios15.2']);
    });

    it('should handle Safari TP (Technology Preview)', () => {
      const targetsWithOlderSafari = transformSupportedBrowsersToTargets([
        'safari TP',
        'safari 16.4',
      ]);
      expect(targetsWithOlderSafari).toEqual(['safari16.4']);

      const targetsWithOnlyTP = transformSupportedBrowsersToTargets(['safari TP']);
      expect(targetsWithOnlyTP).toEqual(['safari999']);
    });

    it('should ignore browsers not supported by esbuild', () => {
      const targets = transformSupportedBrowsersToTargets([
        'android 4.4',
        'samsung 22',
        'kaios 2.5',
        'chrome 115',
      ]);

      expect(targets).toEqual(['chrome115.0']);
    });

    it('should return empty array for empty supportedBrowsers', () => {
      const targets = transformSupportedBrowsersToTargets([]);
      expect(targets).toEqual([]);
    });

    it('should handle malformed or incomplete browser strings gracefully', () => {
      const targets = transformSupportedBrowsersToTargets(['chrome', 'firefox ', '']);
      expect(targets).toEqual([]);
    });

    it('should handle single major versions by appending .0', () => {
      const targets = transformSupportedBrowsersToTargets(['chrome 120', 'edge 120']);
      expect(targets).toEqual(['chrome120.0', 'edge120.0']);
    });
  });

  describe('getSupportedNodeTargets', () => {
    it('should return empty array when node versions are not stamped', () => {
      expect(getSupportedNodeTargets()).toEqual([]);
    });
  });
});
