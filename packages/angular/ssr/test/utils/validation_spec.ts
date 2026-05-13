/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  getFirstHeaderValue,
  normalizeTrustProxyHeaders,
  sanitizeRequestHeaders,
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

  describe('normalizeTrustProxyHeaders', () => {
    it('should return an empty set when input is undefined', () => {
      expect(normalizeTrustProxyHeaders(undefined)).toEqual(new Set());
    });

    it('should return an empty set when input is false', () => {
      expect(normalizeTrustProxyHeaders(false)).toEqual(new Set());
    });

    it('should return a set containing "*" when input is true', () => {
      expect(normalizeTrustProxyHeaders(true)).toEqual(new Set(['*']));
    });

    it('should return a set of lowercased header names when input is an array of strings', () => {
      expect(normalizeTrustProxyHeaders(['X-Forwarded-Host', 'X-Forwarded-Proto'])).toEqual(
        new Set(['x-forwarded-host', 'x-forwarded-proto']),
      );
    });

    it('should throw an error if input array contains "*"', () => {
      expect(() => normalizeTrustProxyHeaders(['*'])).toThrowError(
        '"*" is not allowed as a value for the "trustProxyHeaders" option.',
      );
      expect(() => normalizeTrustProxyHeaders(['X-Forwarded-Host', '*'])).toThrowError(
        '"*" is not allowed as a value for the "trustProxyHeaders" option.',
      );
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

    it('should pass for all hostnames when "*" is used', () => {
      const allowedHosts = new Set(['*']);
      expect(() => validateUrl(new URL('http://example.com'), allowedHosts)).not.toThrow();
      expect(() => validateUrl(new URL('http://google.com'), allowedHosts)).not.toThrow();
      expect(() => validateUrl(new URL('http://evil.com'), allowedHosts)).not.toThrow();
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
        'Header "host" with value "example.com/bad" contains characters that are not allowed.',
      );
    });

    it('should throw if host contains invalid characters', () => {
      const req = new Request('http://example.com', {
        headers: { 'host': 'example.com?query=1' },
      });
      expect(() => validateRequest(req, allowedHosts, false)).toThrowError(
        'Header "host" with value "example.com?query=1" contains characters that are not allowed.',
      );
    });

    it('should throw if x-forwarded-host contains path separators', () => {
      const req = new Request('http://example.com', {
        headers: { 'x-forwarded-host': 'example.com/bad' },
      });
      expect(() => validateRequest(req, allowedHosts, false)).toThrowError(
        'Header "x-forwarded-host" with value "example.com/bad" contains characters that are not allowed.',
      );
    });

    it('should throw error if x-forwarded-prefix is invalid', () => {
      const inputs = [
        '//evil',
        '\\\\evil',
        '/\\evil',
        '\\/evil',
        '\\evil',
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
        'https://attacker.com',
        '%2f%2f',
        '%5C',
        'http://localhost',
        'foo',
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
            'Header "x-forwarded-prefix" is invalid. It must start with a "/" and contain ' +
              'only alphanumeric characters, hyphens, and underscores, separated by single slashes.',
          );
      }
    });

    it('should validate x-forwarded-prefix with valid usage', () => {
      const inputs = ['/foo', '/foo/baz', '/v1', '/app_name', '/', '/my-app'];

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

  describe('sanitizeRequestHeaders', () => {
    it('should scrub unallowed proxy headers by default', () => {
      const req = new Request('http://example.com', {
        headers: {
          'host': 'example.com',
          'x-forwarded-host': 'evil.com',
          'x-forwarded-proto': 'https',
        },
      });
      const secured = sanitizeRequestHeaders(req, normalizeTrustProxyHeaders(undefined));

      expect(secured.headers.get('host')).toBe('example.com');
      expect(secured.headers.has('x-forwarded-host')).toBeFalse();
      expect(secured.headers.has('x-forwarded-proto')).toBeFalse();
    });

    it('should scrub unallowed proxy headers when trustProxyHeaders is false', () => {
      const req = new Request('http://example.com', {
        headers: {
          'host': 'example.com',
          'x-forwarded-host': 'evil.com',
          'x-forwarded-proto': 'https',
        },
      });
      const secured = sanitizeRequestHeaders(req, normalizeTrustProxyHeaders(false));

      expect(secured.headers.get('host')).toBe('example.com');
      expect(secured.headers.has('x-forwarded-host')).toBeFalse();
      expect(secured.headers.has('x-forwarded-proto')).toBeFalse();
    });

    it('should only retain allowed proxy headers when explicitly provided', () => {
      const req = new Request('http://example.com', {
        headers: {
          'host': 'example.com',
          'x-forwarded-host': 'proxy.com',
          'x-forwarded-proto': 'https',
        },
      });
      const secured = sanitizeRequestHeaders(req, normalizeTrustProxyHeaders(['x-forwarded-host']));

      expect(secured.headers.get('host')).toBe('example.com');
      expect(secured.headers.get('x-forwarded-host')).toBe('proxy.com');
      expect(secured.headers.has('x-forwarded-proto')).toBeFalse();
    });

    it('should retain all proxy headers when trustProxyHeaders is true', () => {
      const req = new Request('http://example.com', {
        headers: {
          'host': 'example.com',
          'x-forwarded-host': 'proxy.com',
          'x-forwarded-proto': 'https',
          'x-forwarded-email': 'user@example.com',
        },
      });
      const secured = sanitizeRequestHeaders(req, normalizeTrustProxyHeaders(true));

      expect(secured.headers.get('host')).toBe('example.com');
      expect(secured.headers.get('x-forwarded-host')).toBe('proxy.com');
      expect(secured.headers.get('x-forwarded-proto')).toBe('https');
      expect(secured.headers.get('x-forwarded-email')).toBe('user@example.com');
    });

    it('should not clone the request if no proxy headers need to be removed', () => {
      const req = new Request('http://example.com', {
        headers: { 'accept': 'application/json' },
      });
      const secured = sanitizeRequestHeaders(req, normalizeTrustProxyHeaders(false));

      expect(secured).toBe(req);
      expect(secured.headers.get('accept')).toBe('application/json');
    });
  });
});
