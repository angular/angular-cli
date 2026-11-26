/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  ɵSSR_REQUEST_HEADER as SSR_REQUEST_HEADER,
  ɵisSsrRequest as isSsrRequest,
} from '@angular/platform-server';

export { SSR_REQUEST_HEADER, isSsrRequest };

/**
 * Creates a non-cached response for an incoming request that carries the
 * {@link SSR_REQUEST_HEADER} header, indicating it was sent by an Angular application
 * while rendering on the server.
 *
 * A `404 Not Found` status with `Cache-Control: no-store` is returned instead of `400`
 * because some CDNs (such as CloudFront) ignore `Cache-Control: no-store` on `400`
 * responses and cache them by default, whereas `404` honors `no-store` without
 * triggering 5xx outlier ejection.
 *
 * @param request - The incoming recursive SSR `Request`.
 * @returns A `Response` object with a `404` status code and `Cache-Control: no-store`.
 */
export function createSsrRequestResponse(request: Request): Response {
  if (typeof ngDevMode === 'undefined' || ngDevMode) {
    // eslint-disable-next-line no-console
    console.warn(
      `Refusing to handle request for "${request.url}" because it carries the ` +
        `"${SSR_REQUEST_HEADER}" header, indicating it was sent while rendering on the server.`,
    );
  }

  return new Response('Requests sent while rendering on the server are not rendered.', {
    status: 404,
    statusText: 'Not Found',
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store',
    },
  });
}
