/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SSR_REQUEST_HEADER, createSsrRequestResponse } from '../../src/utils/ssr-request';

describe('SSR Request Utils', () => {
  describe('createSsrRequestResponse', () => {
    it('should return a 404 response with Cache-Control: no-store', async () => {
      spyOn(console, 'warn');
      const response = createSsrRequestResponse(
        new Request('https://example.com/api', {
          headers: { [SSR_REQUEST_HEADER]: '1' },
        }),
      );

      expect(response.status).toBe(404);
      expect(response.statusText).toBe('Not Found');
      expect(Object.fromEntries(response.headers.entries())).toEqual({
        'cache-control': 'no-store',
        'content-type': 'text/plain',
      });
      expect(await response.text()).toBe(
        'Requests sent while rendering on the server are not rendered.',
      );
    });

    it('should emit a warning in dev mode', () => {
      // @ts-expect-error accessing global
      const previousNgDevMode = globalThis.ngDevMode;
      // @ts-expect-error accessing global
      globalThis.ngDevMode = true;

      try {
        const warnSpy = spyOn(console, 'warn');
        createSsrRequestResponse(new Request('https://example.com/api'));

        expect(warnSpy).toHaveBeenCalledWith(
          `Refusing to handle request for "https://example.com/api" because it carries the ` +
            `"${SSR_REQUEST_HEADER}" header, indicating it was sent while rendering on the server.`,
        );
      } finally {
        // @ts-expect-error accessing global
        globalThis.ngDevMode = previousNgDevMode;
      }
    });

    it('should not emit a warning when ngDevMode is false', () => {
      // @ts-expect-error accessing global
      const previousNgDevMode = globalThis.ngDevMode;
      // @ts-expect-error accessing global
      globalThis.ngDevMode = false;

      try {
        const warnSpy = spyOn(console, 'warn');
        createSsrRequestResponse(new Request('https://example.com/api'));

        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        // @ts-expect-error accessing global
        globalThis.ngDevMode = previousNgDevMode;
      }
    });
  });
});
