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

    it('should create a redirect response when the location has the maximum allowed length', () => {
      const location = '/' + 'a'.repeat(99);
      const response = createRedirectResponse(location, 302, undefined, 100);
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe(location);
    });

    it('should return a 400 response when the location exceeds the maximum allowed length', async () => {
      const errorSpy = spyOn(console, 'error');
      const response = createRedirectResponse(
        '/' + 'a'.repeat(100),
        301,
        { 'Cache-Control': 'public, max-age=3600' },
        100,
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('Location')).toBeNull();
      expect(response.headers.get('Cache-Control')).toBeNull();
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(await response.text()).toBe(
        'Redirect location is 101 characters long, which exceeds the maximum allowed length of 100 characters.',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        jasmine.stringMatching('Redirect location is 101 characters long'),
      );
    });

    it('should not limit the length of the location when no maximum length is provided', () => {
      const location = '/' + 'a'.repeat(10_000);
      const response = createRedirectResponse(location);
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe(location);
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
