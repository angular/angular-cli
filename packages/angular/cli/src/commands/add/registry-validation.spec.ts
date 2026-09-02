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
      expect(SHELL_METACHARACTERS.test('`')).toBe(true);
      expect(SHELL_METACHARACTERS.test('(')).toBe(true);
      expect(SHELL_METACHARACTERS.test(')')).toBe(true);
    });

    it('should not match safe URL characters', () => {
      expect(SHELL_METACHARACTERS.test('https://registry.example.com')).toBe(false);
      expect(SHELL_METACHARACTERS.test('http://registry.example.com/path')).toBe(false);
      expect(SHELL_METACHARACTERS.test('https://registry.example.com:8080')).toBe(false);
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

  describe('Windows shell quoting', () => {
    it('should wrap args in double quotes', () => {
      const command = 'npm';
      const args = ['--registry', 'https://registry.example.com'];
      const result = `${command} ${args
        .map((a) => `"${String(a).replace(/"/g, '\\"')}"`)
        .join(' ')}`;
      expect(result).toBe(
        'npm "--registry" "https://registry.example.com"',
      );
    });

    it('should escape inner double quotes', () => {
      const command = 'npm';
      const args = ['--registry', 'https://example.com?key="value"'];
      const result = `${command} ${args
        .map((a) => `"${String(a).replace(/"/g, '\\"')}"`)
        .join(' ')}`;
      expect(result).toBe(
        'npm "--registry" "https://example.com?key=\\"value\\""',
      );
    });
  });
});
