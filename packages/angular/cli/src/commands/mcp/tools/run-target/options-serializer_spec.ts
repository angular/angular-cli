/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { serializeOptions } from './options-serializer';

describe('run-target options-serializer', () => {
  describe('serializeOptions', () => {
    it('should return empty array if options are undefined', () => {
      expect(serializeOptions(undefined)).toEqual([]);
    });

    it('should serialize boolean options correctly', () => {
      expect(serializeOptions({ fix: true, quiet: false })).toEqual(['--fix', '--no-quiet']);
    });

    it('should serialize string and number options correctly', () => {
      expect(serializeOptions({ browsers: 'Chrome', timeout: 5000 })).toEqual([
        '--browsers=Chrome',
        '--timeout=5000',
      ]);
    });

    it('should serialize array options as multiple occurrences of the flag', () => {
      expect(serializeOptions({ include: ['a', 'b'] })).toEqual(['--include=a', '--include=b']);
    });

    it('should ignore excluded keys successfully', () => {
      expect(serializeOptions({ watch: true, fix: true }, new Set(['watch']))).toEqual(['--fix']);
    });

    it('should ignore null and undefined values successfully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(serializeOptions({ empty: null, missing: undefined, fix: true } as any)).toEqual([
        '--fix',
      ]);
    });

    it('should throw an error if key is malformed (whitespace or special characters)', () => {
      expect(() => serializeOptions({ 'fix --danger': true })).toThrowError(
        /Invalid option key: 'fix --danger'/,
      );
    });
  });
});
