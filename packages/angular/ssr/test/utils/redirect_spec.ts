/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRedirectResponse } from '../../src/utils/redirect';

describe('Redirect Utils', () => {
  describe('createRedirectResponse', () => {
    it('should create a redirect response with default status 302', () => {
      const response = createRedirectResponse('/home');
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/home');
      expect(response.headers.get('Vary')).toBe('X-Forwarded-Prefix');
    });

    it('should create a redirect response with a custom status', () => {
      const response = createRedirectResponse('/home', 301);
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe('/home');
    });

    it('should allow providing additional headers', () => {
      const response = createRedirectResponse('/home', 302, { 'X-Custom': 'value' });
      expect(response.headers.get('X-Custom')).toBe('value');
      expect(response.headers.get('Location')).toBe('/home');
      expect(response.headers.get('Vary')).toBe('X-Forwarded-Prefix');
    });

    it('should append to Vary header instead of overriding it', () => {
      const response = createRedirectResponse('/home', 302, {
        'Location': '/evil',
        'Vary': 'Host',
      });
      expect(response.headers.get('Location')).toBe('/home');
      expect(response.headers.get('Vary')).toBe('X-Forwarded-Prefix, Host');
    });

    it('should NOT add duplicate X-Forwarded-Prefix if already present in Vary header', () => {
      const response = createRedirectResponse('/home', 302, {
        'Vary': 'X-Forwarded-Prefix, Host',
      });
      expect(response.headers.get('Vary')).toBe('X-Forwarded-Prefix, Host');
    });

    it('should normalize the Location header to an absolute path', () => {
      const locations = {
        '//example.com': '/example.com',
        '///example.com': '/example.com',
        '/\\example.com': '/example.com',
        '\\\\example.com': '/example.com',
        // A tab, line feed or carriage return is removed by the URL parser before it parses, so
        // one between the slashes still yields a protocol-relative URL unless it is collapsed too.
        '/\t/example.com': '/example.com',
        '/\t\\example.com': '/example.com',
        '\t//example.com': '/example.com',
        '/\n/example.com': '/example.com',
        '/\r/example.com': '/example.com',
        'https://example.com/path': '/https://example.com/path',
        '': '/',
      };

      for (const [location, expected] of Object.entries(locations)) {
        const response = createRedirectResponse(location);
        expect(response.headers.get('Location'))
          .withContext(`Location: "${location}"`)
          .toBe(expected);
      }
    });

    it('should never emit a Location header that resolves to another origin', () => {
      const origin = 'https://example.com';

      // The guarantee is about every string, so the inputs are generated rather than listed: a
      // hand-written list only covers the escapes that were thought of when it was written.
      // These are the characters that can begin an authority once a client parses the value,
      // either directly or because the URL parser removes them first.
      const separators = ['/', '\\', '\t', '\n', '\r', ' ', '.', ';', '@', '%2f', '%5c', '%09'];
      const locations = new Set([
        'https://evil.test/path',
        'evil.test:8080/path',
        'javascript:alert(1)',
        '',
      ]);

      for (const first of separators) {
        for (const second of separators) {
          for (const third of separators) {
            locations.add(`${first}${second}${third}evil.test`);
          }
        }
      }

      const escapes: string[] = [];
      for (const location of locations) {
        let emitted: string | null;
        try {
          emitted = createRedirectResponse(location).headers.get('Location');
        } catch {
          // A value the Headers layer rejects, such as one containing a line feed, can never be
          // emitted in the first place.
          continue;
        }

        if (new URL(emitted ?? '', origin).origin !== origin) {
          escapes.push(`${JSON.stringify(location)} -> ${JSON.stringify(emitted)}`);
        }
      }

      expect(escapes)
        .withContext(`Locations that left the origin: ${escapes.join(', ')}`)
        .toEqual([]);
    });

    it('should warn if the Location is rewritten in dev mode', () => {
      // @ts-expect-error accessing global
      globalThis.ngDevMode = true;
      const warnSpy = spyOn(console, 'warn');
      createRedirectResponse('//example.com');
      expect(warnSpy).toHaveBeenCalledWith(
        'Location "//example.com" is not an absolute path and was rewritten to "/example.com" ' +
          'to keep the redirect on the current origin.',
      );
    });

    it('should warn if Location header is provided in extra headers in dev mode', () => {
      // @ts-expect-error accessing global
      globalThis.ngDevMode = true;
      const warnSpy = spyOn(console, 'warn');
      createRedirectResponse('/home', 302, { 'Location': '/evil' });
      expect(warnSpy).toHaveBeenCalledWith(
        'Location header "/evil" will be ignored and set to "/home".',
      );
    });

    it('should throw error for invalid redirect status code in dev mode', () => {
      // @ts-expect-error accessing global
      globalThis.ngDevMode = true;
      expect(() => createRedirectResponse('/home', 200)).toThrowError(
        /Invalid redirect status code: 200/,
      );
    });
  });
});
