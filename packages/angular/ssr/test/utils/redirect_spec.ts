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
    });

    it('should warn if Location header is provided in extra headers in dev mode', () => {
      // @ts-expect-error accessing global
      globalThis.ngDevMode = true;
      const warnSpy = spyOn(console, 'warn');
      createRedirectResponse('/home', 302, { 'Location': '/evil' });
      expect(warnSpy).toHaveBeenCalledWith(
        'Location header "/evil" will ignored and set to "/home".',
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
