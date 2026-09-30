/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { addLeadingSlash, collapseLeadingSlashes } from './url';

/**
 * An set of HTTP status codes that are considered valid for redirect responses.
 */
export const VALID_REDIRECT_RESPONSE_CODES: ReadonlySet<number> = new Set([
  301, 302, 303, 307, 308,
]);

/**
 * Checks if the given HTTP status code is a valid redirect response code.
 *
 * @param code The HTTP status code to check.
 * @returns `true` if the code is a valid redirect response code, `false` otherwise.
 */
export function isValidRedirectResponseCode(code: number): boolean {
  return VALID_REDIRECT_RESPONSE_CODES.has(code);
}

/**
 * Creates an HTTP redirect response with a specified location and status code.
 *
 * @param location - The path to which the response should redirect. It is normalized to an
 *                   absolute path, as a `Location` value is resolved against the request URL and
 *                   must therefore not be able to point to another origin.
 * @param status - The HTTP status code for the redirection. Defaults to 302 (Found).
 *                 See: https://developer.mozilla.org/en-US/docs/Web/API/Response/redirect_static#status
 * @param headers - Additional headers to include in the response.
 * @returns A `Response` object representing the HTTP redirect.
 */
export function createRedirectResponse(
  location: string,
  status = 302,
  headers?: Record<string, string> | Headers,
): Response {
  if (ngDevMode && !isValidRedirectResponseCode(status)) {
    throw new Error(
      `Invalid redirect status code: ${status}. ` +
        `Please use one of the following redirect response codes: ${[...VALID_REDIRECT_RESPONSE_CODES.values()].join(', ')}.`,
    );
  }

  // A `Location` value is resolved against the request URL. Only a path that starts with a single
  // slash is guaranteed to resolve to the current origin: two leading slashes make it a
  // protocol-relative URL, and a missing leading slash can make it an absolute URL.
  const normalizedLocation = addLeadingSlash(collapseLeadingSlashes(location));
  if (ngDevMode && normalizedLocation !== location) {
    // eslint-disable-next-line no-console
    console.warn(
      `Location "${location}" is not an absolute path and was rewritten to "${normalizedLocation}" ` +
        `to keep the redirect on the current origin.`,
    );
  }

  const resHeaders = headers instanceof Headers ? headers : new Headers(headers);
  if (ngDevMode && resHeaders.has('location')) {
    // eslint-disable-next-line no-console
    console.warn(
      `Location header "${resHeaders.get('location')}" will be ignored and set to "${location}".`,
    );
  }

  // Ensure unique values for Vary header
  const varyArray = resHeaders.get('Vary')?.split(',') ?? [];
  const varySet = new Set(['X-Forwarded-Prefix']);
  for (const vary of varyArray) {
    const value = vary.trim();

    if (value) {
      varySet.add(value);
    }
  }

  resHeaders.set('Vary', [...varySet].join(', '));
  resHeaders.set('Location', normalizedLocation);

  return new Response(null, {
    status,
    headers: resHeaders,
  });
}
