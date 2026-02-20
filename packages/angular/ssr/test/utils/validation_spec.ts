/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  cloneRequestWithPatchedHeaders,
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

      expect(() => validateRequest(req, allowedHosts)).not.toThrow();
    });

    it('should throw if URL hostname is invalid', () => {
      const req = new Request('http://evil.com');

      expect(() => validateRequest(req, allowedHosts)).toThrowError(
        /URL with hostname "evil.com" is not allowed/,
      );
    });

    it('should throw if x-forwarded-port is invalid', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-port': 'abc' },
      });

      expect(() => validateRequest(req, allowedHosts)).toThrowError(
        'Header "x-forwarded-port" must be a numeric value.',
      );
    });

    it('should throw if x-forwarded-proto is invalid', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-proto': 'ftp' },
      });
      expect(() => validateRequest(req, allowedHosts)).toThrowError(
        'Header "x-forwarded-proto" must be either "http" or "https".',
      );
    });

    it('should throw if host contains path separators', () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'example.com/bad' },
      });
      expect(() => validateRequest(req, allowedHosts)).toThrowError(
        'Header "host" contains path separators which is not allowed.',
      );
    });

    it('should throw if x-forwarded-host contains path separators', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-host': 'example.com/bad' },
      });
      expect(() => validateRequest(req, allowedHosts)).toThrowError(
        'Header "x-forwarded-host" contains path separators which is not allowed.',
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

        expect(() => validateRequest(request, allowedHosts))
          .withContext(`Prefix: "${prefix}"`)
          .toThrowError('Header "x-forwarded-prefix" must not start with multiple "/" or "\\".');
      }
    });
  });

  describe('cloneRequestWithPatchedHeaders', () => {
    const allowedHosts = new Set(['example.com', '*.valid.com']);

    it('should validate host header when accessed via get()', async () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'evil.com' },
      });
      const { request: secured, onError } = cloneRequestWithPatchedHeaders(req, allowedHosts);

      secured.headers.get('host');
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
      const { request: secured } = cloneRequestWithPatchedHeaders(req, allowedHosts);
      expect(secured.headers.get('host')).toBe('example.com');
    });

    it('should validate x-forwarded-host header', async () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-host': 'evil.com' },
      });
      const { request: secured, onError } = cloneRequestWithPatchedHeaders(req, allowedHosts);

      secured.headers.get('x-forwarded-host');

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
      const { request: secured } = cloneRequestWithPatchedHeaders(req, allowedHosts);

      expect(secured.headers.get('accept')).toBe('application/json');
    });

    it('should bind methods correctly', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-foo': 'bar' },
      });
      const { request: secured } = cloneRequestWithPatchedHeaders(req, allowedHosts);

      expect(typeof secured.headers.has).toBe('function');
      expect(secured.headers.has('x-foo')).toBeTrue();
    });
  });
});
