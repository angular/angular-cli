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

    it('should throw an error if key starts with a hyphen or underscore', () => {
      expect(() => serializeOptions({ '-output-path': 'dist' })).toThrowError(
        /Invalid option key: '-output-path'/,
      );
      expect(() => serializeOptions({ '_output': 'dist' })).toThrowError(
        /Invalid option key: '_output'/,
      );
    });

    it('should ignore excluded keys case-insensitively', () => {
      expect(serializeOptions({ WATCH: true, fix: true }, new Set(['watch']))).toEqual(['--fix']);
    });

    it('should throw an error if a string option value contains a null byte', () => {
      expect(() => serializeOptions({ 'output-path': 'dist\0evil' })).toThrowError(
        /Invalid option value for 'output-path': values must not contain null bytes/,
      );
      expect(() => serializeOptions({ include: ['src', 'evil\0path'] })).toThrowError(
        /Invalid option value for 'include': values must not contain null bytes/,
      );
    });
  });
});
