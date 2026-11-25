/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { PlatformLocation } from '@angular/common';
import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

/**
 * The header added to the HTTP requests that an application sends to its own host while it is
 * rendered on the server. The server does not render requests that carry it.
 */
export const SSR_REQUEST_HEADER = 'x-angular-ssr-request';

/**
 * Adds the {@link SSR_REQUEST_HEADER} header to the requests sent to the host of the page being
 * rendered. Such a request could otherwise be rendered as a page that sends the same request again,
 * without bound.
 *
 * Host names are compared rather than origins: behind a proxy that terminates TLS, the page is
 * rendered for `http:` while the application may call its public `https:` URL.
 *
 * This interceptor must run after the `@angular/platform-server` interceptor that resolves relative
 * URLs. Requests that are not sent through the `HttpClient` interceptors are not marked.
 */
export const ssrRequestInterceptorFn: HttpInterceptorFn = (request, next) => {
  const { href, hostname } = inject(PlatformLocation);
  if (!URL.canParse(href)) {
    // The URL of the page is unknown, so requests sent to its host cannot be recognized.
    return next(request);
  }

  // URLs that cannot be parsed are marked too: some HTTP clients still send a request for them.
  if (
    URL.canParse(request.urlWithParams, href) &&
    new URL(request.urlWithParams, href).hostname !== hostname
  ) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { [SSR_REQUEST_HEADER]: '1' } }));
};

/**
 * Creates the response to a request that the application sent to its own host while it was
 * rendered on the server. The request is not rendered. The response is only meaningful to the
 * render that sent the request, so it does not include the headers configured for the route and
 * must not be stored.
 *
 * @returns A `Response` object with a 400 status code.
 */
export function createSsrRequestResponse(): Response {
  return new Response('Requests sent while rendering on the server are not rendered.', {
    status: 400,
    statusText: 'Bad Request',
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store',
    },
  });
}
