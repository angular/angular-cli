/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SHELL_METACHARACTERS, validateRegistry } from './cli';

describe('registry validation', () => {
  describe('SHELL_METACHARACTERS', () => {
    it('should match shell metacharacters', () => {
      expect(SHELL_METACHARACTERS.test('&')).toBe(true);
      expect(SHELL_METACHARACTERS.test('|')).toBe(true);
      expect(SHELL_METACHARACTERS.test(';')).toBe(true);
      expect(SHELL_METACHARACTERS.test('$')).toBe(true);
      expect(SHELL_METACHARACTERS.test(String.fromCharCode(96))).toBe(true);
      expect(SHELL_METACHARACTERS.test('(')).toBe(true);
      expect(SHELL_METACHARACTERS.test(')')).toBe(true);
      expect(SHELL_METACHARACTERS.test('<')).toBe(true);
      expect(SHELL_METACHARACTERS.test('>')).toBe(true);
      expect(SHELL_METACHARACTERS.test('"')).toBe(true);
      expect(SHELL_METACHARACTERS.test("'")).toBe(true);
      expect(SHELL_METACHARACTERS.test('\n')).toBe(true);
      expect(SHELL_METACHARACTERS.test('\r')).toBe(true);
    });

    it('should not match safe URL characters', () => {
      expect(SHELL_METACHARACTERS.test('https://registry.example.com')).toBe(false);
      expect(SHELL_METACHARACTERS.test('http://registry.example.com:8080')).toBe(false);
      expect(SHELL_METACHARACTERS.test('https://registry.example.com/path')).toBe(false);
    });
  });

  describe('validateRegistry', () => {
    it('should reject URLs with shell metacharacters', () => {
      expect(() => validateRegistry('https://example.com&cmd')).toThrow(
        'Option --registry contains invalid characters.',
      );
      expect(() => validateRegistry('https://example.com|cmd')).toThrow(
        'Option --registry contains invalid characters.',
      );
      expect(() => validateRegistry('https://example.com;cmd')).toThrow(
        'Option --registry contains invalid characters.',
      );
      expect(() => validateRegistry('https://example.com$cmd')).toThrow(
        'Option --registry contains invalid characters.',
      );
      expect(() => validateRegistry('https://example.com`cmd`')).toThrow(
        'Option --registry contains invalid characters.',
      );
      expect(() => validateRegistry('https://example.com(cmd)')).toThrow(
        'Option --registry contains invalid characters.',
      );
      expect(() => validateRegistry('https://example.com?q=">whoami')).toThrow(
        'Option --registry contains invalid characters.',
      );
    });

    it('should accept valid URLs', () => {
      expect(() => validateRegistry('https://registry.example.com')).not.toThrow();
      expect(() => validateRegistry('http://registry.example.com:8080')).not.toThrow();
      expect(() => validateRegistry('https://registry.example.com/path')).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      expect(() => validateRegistry('not-a-url')).toThrow(
        'Option --registry must be a valid URL.',
      );
    });
  });
});
