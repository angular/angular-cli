/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  cloneRequestAndPatchHeaders,
  getFirstHeaderValue,
  validateRequest,
  validateUrl,
} from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('getFirstHeaderValue', () => {
    it('should return the first value from a comma-separated string', () => {
      expect(getFirstHeaderValue('value1, value2')).toBe('value1');
    });

    it('should return the value if it is a single string', () => {
      expect(getFirstHeaderValue('value1')).toBe('value1');
    });

    it('should return the first value from an array of strings', () => {
      expect(getFirstHeaderValue(['value1', 'value2'])).toBe('value1');
    });

    it('should return undefined for null or undefined', () => {
      expect(getFirstHeaderValue(null)).toBeUndefined();
      expect(getFirstHeaderValue(undefined)).toBeUndefined();
    });

    it('should return empty string for empty string input', () => {
      expect(getFirstHeaderValue('')).toBe('');
    });
  });

  describe('validateUrl', () => {
    const allowedHosts = new Set(['example.com', '*.google.com']);

    it('should pass for allowed hostname', () => {
      expect(() => validateUrl(new URL('http://example.com'), allowedHosts)).not.toThrow();
    });

    it('should pass for wildcard allowed hostname', () => {
      expect(() => validateUrl(new URL('http://foo.google.com'), allowedHosts)).not.toThrow();
    });

    it('should throw for disallowed hostname', () => {
      expect(() => validateUrl(new URL('http://evil.com'), allowedHosts)).toThrowError(
        /URL with hostname "evil.com" is not allowed/,
      );
    });

    it('should match subdomains for wildcard', () => {
      expect(() => validateUrl(new URL('http://sub.foo.google.com'), allowedHosts)).not.toThrow();
    });

    it('should not match base domain for wildcard (*.google.com vs google.com)', () => {
      // Logic: hostname.endsWith('.google.com') -> 'google.com'.endsWith('.google.com') is false
      expect(() => validateUrl(new URL('http://google.com'), allowedHosts)).toThrowError(
        /URL with hostname "google.com" is not allowed/,
      );
    });
  });

  describe('validateRequest', () => {
    const allowedHosts = new Set(['example.com']);

    it('should pass for valid request', () => {
      const req = new Request('http://example.com', {
        headers: {
          'x-forwarded-port': '443',
          'x-forwarded-proto': 'https',
        },
      });

      expect(() => validateRequest(req, allowedHosts, false)).not.toThrow();
    });

    it('should pass for valid request when disableHostCheck is true', () => {
      const req = new Request('http://evil.com');

      expect(() => validateRequest(req, allowedHosts, true)).not.toThrow();
    });

    it('should throw if URL hostname is invalid', () => {
      const req = new Request('http://evil.com');

      expect(() => validateRequest(req, allowedHosts, false)).toThrowError(
        /URL with hostname "evil.com" is not allowed/,
      );
    });

    it('should throw if x-forwarded-port is invalid', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-port': 'abc' },
      });

      expect(() => validateRequest(req, allowedHosts, false)).toThrowError(
        'Header "x-forwarded-port" must be a numeric value.',
      );
    });

    it('should throw if x-forwarded-proto is invalid', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-proto': 'ftp' },
      });
      expect(() => validateRequest(req, allowedHosts, false)).toThrowError(
        'Header "x-forwarded-proto" must be either "http" or "https".',
      );
    });

    it('should pass for valid x-forwarded-proto (case-insensitive)', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-proto': 'HTTP' },
      });
      expect(() => validateRequest(req, allowedHosts, false)).not.toThrow();
    });

    it('should throw if host contains path separators', () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'example.com/bad' },
      });
      expect(() => validateRequest(req, allowedHosts, false)).toThrowError(
        'Header "host" contains characters that are not allowed.',
      );
    });

    it('should throw if host contains invalid characters', () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'example.com?query=1' },
      });
      expect(() => validateRequest(req, allowedHosts, false)).toThrowError(
        'Header "host" contains characters that are not allowed.',
      );
    });

    it('should throw if x-forwarded-host contains path separators', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-host': 'example.com/bad' },
      });
      expect(() => validateRequest(req, allowedHosts, false)).toThrowError(
        'Header "x-forwarded-host" contains characters that are not allowed.',
      );
    });

    it('should throw error if x-forwarded-prefix starts with multiple slashes or backslashes', () => {
      const inputs = ['//evil', '\\\\evil', '/\\evil', '\\/evil'];

      for (const prefix of inputs) {
        const request = new Request('https://example.com', {
          headers: {
            'x-forwarded-prefix': prefix,
          },
        });

        expect(() => validateRequest(request, allowedHosts, false))
          .withContext(`Prefix: "${prefix}"`)
          .toThrowError(
            'Header "x-forwarded-prefix" must not start with multiple "/" or "\\" or contain ".", ".." path segments.',
          );
      }
    });

    it('should throw error if x-forwarded-prefix contains dot segments', () => {
      const inputs = [
        '/./',
        '/../',
        '/foo/./bar',
        '/foo/../bar',
        '/.',
        '/..',
        './',
        '../',
        '.\\',
        '..\\',
        '/foo/.\\bar',
        '/foo/..\\bar',
        '.',
        '..',
      ];

      for (const prefix of inputs) {
        const request = new Request('https://example.com', {
          headers: {
            'x-forwarded-prefix': prefix,
          },
        });

        expect(() => validateRequest(request, allowedHosts, false))
          .withContext(`Prefix: "${prefix}"`)
          .toThrowError(
            'Header "x-forwarded-prefix" must not start with multiple "/" or "\\" or contain ".", ".." path segments.',
          );
      }
    });

    it('should validate x-forwarded-prefix with valid dot usage', () => {
      const inputs = ['/foo.bar', '/foo.bar/baz', '/v1.2', '/.well-known'];

      for (const prefix of inputs) {
        const request = new Request('https://example.com', {
          headers: {
            'x-forwarded-prefix': prefix,
          },
        });

        expect(() => validateRequest(request, allowedHosts, false))
          .withContext(`Prefix: "${prefix}"`)
          .not.toThrow();
      }
    });
  });

  describe('cloneRequestAndPatchHeaders', () => {
    const allowedHosts = new Set(['example.com', '*.valid.com']);

    it('should validate host header when accessed via get()', async () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'evil.com' },
      });
      const { request: secured, onError } = cloneRequestAndPatchHeaders(req, allowedHosts);

      expect(() => secured.headers.get('host')).toThrowError(
        'Header "host" with value "evil.com" is not allowed.',
      );
      await expectAsync(onError).toBeResolvedTo(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Header "host" with value "evil.com" is not allowed'),
        }),
      );
    });

    it('should allow valid host header', () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'example.com' },
      });
      const { request: secured } = cloneRequestAndPatchHeaders(req, allowedHosts);
      expect(secured.headers.get('host')).toBe('example.com');
    });

    it('should validate x-forwarded-host header', async () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-host': 'evil.com' },
      });
      const { request: secured, onError } = cloneRequestAndPatchHeaders(req, allowedHosts);

      expect(() => secured.headers.get('x-forwarded-host')).toThrowError(
        'Header "x-forwarded-host" with value "evil.com" is not allowed.',
      );
      await expectAsync(onError).toBeResolvedTo(
        jasmine.objectContaining({
          message: jasmine.stringMatching(
            'Header "x-forwarded-host" with value "evil.com" is not allowed',
          ),
        }),
      );
    });

    it('should allow accessing other headers without validation', () => {
      const req = new Request('http://example.com', {
        headers: { 'accept': 'application/json' },
      });
      const { request: secured } = cloneRequestAndPatchHeaders(req, allowedHosts);

      expect(secured.headers.get('accept')).toBe('application/json');
    });

    it('should validate headers when iterating with entries()', async () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'evil.com' },
      });
      const { request: secured, onError } = cloneRequestAndPatchHeaders(req, allowedHosts);

      expect(() => {
        for (const _ of secured.headers.entries()) {
          // access the header to trigger the validation
        }
      }).toThrowError('Header "host" with value "evil.com" is not allowed.');

      await expectAsync(onError).toBeResolvedTo(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Header "host" with value "evil.com" is not allowed.'),
        }),
      );
    });

    it('should validate headers when iterating with values()', async () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'evil.com' },
      });
      const { request: secured, onError } = cloneRequestAndPatchHeaders(req, allowedHosts);

      expect(() => {
        for (const _ of secured.headers.values()) {
          // access the header to trigger the validation
        }
      }).toThrowError('Header "host" with value "evil.com" is not allowed.');

      await expectAsync(onError).toBeResolvedTo(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Header "host" with value "evil.com" is not allowed.'),
        }),
      );
    });

    it('should validate headers when iterating with for...of', async () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'evil.com' },
      });
      const { request: secured, onError } = cloneRequestAndPatchHeaders(req, allowedHosts);

      expect(() => {
        for (const _ of secured.headers) {
          // access the header to trigger the validation
        }
      }).toThrowError('Header "host" with value "evil.com" is not allowed.');

      await expectAsync(onError).toBeResolvedTo(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Header "host" with value "evil.com" is not allowed.'),
        }),
      );
    });
  });
});
