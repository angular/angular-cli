/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { validateRequest, validateUrl } from '../../src/utils/validation';

describe('validateRequest', () => {
  const allowedHosts = new Set(['example.com', 'sub.example.com']);

  it('should pass valid headers with allowed host', () => {
    const request = new Request('https://example.com', {
      headers: {
        'host': 'example.com',
        'x-forwarded-host': 'sub.example.com',
        'x-forwarded-port': '443',
        'x-forwarded-proto': 'https',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).not.toThrow();
  });

  it('should pass valid headers with localhost (default allowed)', () => {
    const request = new Request('https://localhost', {
      headers: {
        'host': 'localhost',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).not.toThrow();
  });

  it('should throw error for disallowed host', () => {
    const request = new Request('https://evil.com', {
      headers: {
        'host': 'evil.com',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).toThrowError(
      /Header "host" with value "evil\.com" is not allowed/,
    );
  });

  // ...

  it('should throw error for disallowed x-forwarded-host', () => {
    const request = new Request('https://example.com', {
      headers: {
        'host': 'example.com',
        'x-forwarded-host': 'evil.com',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).toThrowError(
      /Header "x-forwarded-host" with value "evil\.com" is not allowed/,
    );
  });

  it('should throw error for invalid x-forwarded-host containing path separators', () => {
    const request = new Request('https://example.com', {
      headers: {
        'host': 'example.com',
        'x-forwarded-host': 'example.com/evil',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).toThrowError(
      'Header "x-forwarded-host" contains path separators which is not allowed.',
    );
  });

  it('should throw error for invalid x-forwarded-port (non-numeric)', () => {
    const request = new Request('https://example.com', {
      headers: {
        'host': 'example.com',
        'x-forwarded-port': 'abc',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).toThrowError(
      'Header "x-forwarded-port" must be a numeric value.',
    );
  });

  it('should throw error for invalid x-forwarded-proto', () => {
    const request = new Request('https://example.com', {
      headers: {
        'host': 'example.com',
        'x-forwarded-proto': 'ftp',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).toThrowError(
      'Header "x-forwarded-proto" must be either "http" or "https".',
    );
  });

  it('should pass for valid x-forwarded-proto (case insensitive)', () => {
    const request = new Request('https://example.com', {
      headers: {
        'host': 'example.com',
        'x-forwarded-proto': 'HTTP',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).not.toThrow();
  });

  it('should ignore port in host validation', () => {
    const request = new Request('https://example.com:8080', {
      headers: {
        'host': 'example.com:8080',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).not.toThrow();
  });

  it('should throw if host header is completely malformed url', () => {
    const request = new Request('https://example.com', {
      headers: {
        'host': '[',
      },
    });

    expect(() => validateRequest(request, allowedHosts)).toThrowError(
      'Header "host" contains an invalid value.',
    );
  });

  describe('wildcard allowed hosts', () => {
    const wildcardHosts = new Set(['*.example.com']);

    it('should match subdomain', () => {
      const request = new Request('https://sub.example.com', {
        headers: {
          'host': 'sub.example.com',
        },
      });

      expect(() => validateRequest(request, wildcardHosts)).not.toThrow();
    });

    it('should match nested subdomain', () => {
      const request = new Request('https://deep.sub.example.com', {
        headers: {
          'host': 'deep.sub.example.com',
        },
      });

      expect(() => validateRequest(request, wildcardHosts)).not.toThrow();
    });

    it('should not match base domain', () => {
      const request = new Request('https://example.com', {
        headers: {
          'host': 'example.com',
        },
      });

      expect(() => validateRequest(request, wildcardHosts)).toThrowError(
        /Header "host" with value "example\.com" is not allowed/,
      );
    });

    it('should not match other domain', () => {
      const request = new Request('https://evil.com', {
        headers: {
          'host': 'evil.com',
        },
      });

      expect(() => validateRequest(request, wildcardHosts)).toThrowError(
        /Header "host" with value "evil\.com" is not allowed/,
      );
    });
  });

  it('should pass valid URL with allowed host', () => {
    const request = new Request('https://example.com/path');
    expect(() => validateRequest(request, allowedHosts)).not.toThrow();
  });

  it('should pass valid URL with allowed sub-domain', () => {
    const request = new Request('https://sub.example.com/path');
    expect(() => validateRequest(request, allowedHosts)).not.toThrow();
  });

  it('should throw error for disallowed host', () => {
    const request = new Request('https://evil.com/path');
    expect(() => validateRequest(request, allowedHosts)).toThrowError(
      /URL with hostname "evil\.com" is not allowed/,
    );
  });
});
