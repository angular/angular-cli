/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  isNodeVersionMinSupported,
  isNodeVersionRunnable,
  isNodeVersionSupported,
} from './node-version';

describe('node-version', () => {
  const supportedVersions = ['22.22.3', '24.15.0', '26.0.0'];

  describe('isNodeVersionSupported', () => {
    it('should accept valid LTS versions', () => {
      expect(isNodeVersionSupported('22.22.3', supportedVersions)).toBeTrue();
      expect(isNodeVersionSupported('22.23.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionSupported('24.15.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionSupported('24.16.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionSupported('26.0.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionSupported('26.1.0', supportedVersions)).toBeTrue();
    });

    it('should reject versions below the minimum for a supported major', () => {
      expect(isNodeVersionSupported('22.22.2', supportedVersions)).toBeFalse();
      expect(isNodeVersionSupported('22.0.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionSupported('24.14.9', supportedVersions)).toBeFalse();
      expect(isNodeVersionSupported('20.18.0', supportedVersions)).toBeFalse();
    });

    it('should reject odd-numbered major versions', () => {
      expect(isNodeVersionSupported('23.0.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionSupported('25.0.0', supportedVersions)).toBeFalse();
    });

    it('should reject versions higher than the maximum supported LTS version', () => {
      expect(isNodeVersionSupported('27.0.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionSupported('28.0.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionSupported('29.1.2', supportedVersions)).toBeFalse();
    });

    it('should return true when unstamped (0.0.0-ENGINES-NODE)', () => {
      expect(isNodeVersionSupported()).toBeTrue();
    });
  });

  describe('isNodeVersionRunnable', () => {
    it('should allow odd-numbered interim releases between min and max major', () => {
      expect(isNodeVersionRunnable('23.0.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionRunnable('25.0.0', supportedVersions)).toBeTrue();
    });

    it('should allow versions higher than the maximum supported major', () => {
      expect(isNodeVersionRunnable('27.0.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionRunnable('28.0.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionRunnable('29.1.2', supportedVersions)).toBeTrue();
    });

    it('should return false for supported LTS versions', () => {
      expect(isNodeVersionRunnable('22.22.3', supportedVersions)).toBeFalse();
      expect(isNodeVersionRunnable('24.15.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionRunnable('26.0.0', supportedVersions)).toBeFalse();
    });

    it('should return false for versions below the minimum major', () => {
      expect(isNodeVersionRunnable('18.0.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionRunnable('20.0.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionRunnable('21.0.0', supportedVersions)).toBeFalse();
    });

    it('should return false for outdated minors of supported majors', () => {
      expect(isNodeVersionRunnable('22.0.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionRunnable('24.10.0', supportedVersions)).toBeFalse();
    });
  });

  describe('isNodeVersionMinSupported', () => {
    it('should accept versions at or above the minimum supported version', () => {
      expect(isNodeVersionMinSupported('22.22.3', supportedVersions)).toBeTrue();
      expect(isNodeVersionMinSupported('22.25.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionMinSupported('23.0.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionMinSupported('24.0.0', supportedVersions)).toBeTrue();
      expect(isNodeVersionMinSupported('28.0.0', supportedVersions)).toBeTrue();
    });

    it('should reject versions below the minimum supported version', () => {
      expect(isNodeVersionMinSupported('22.22.2', supportedVersions)).toBeFalse();
      expect(isNodeVersionMinSupported('20.0.0', supportedVersions)).toBeFalse();
      expect(isNodeVersionMinSupported('18.19.0', supportedVersions)).toBeFalse();
    });
  });
});
