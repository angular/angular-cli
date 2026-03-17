/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * An set of HTTP status codes that are considered valid for redirect responses.
 */
export const VALID_REDIRECT_RESPONSE_CODES: Set<number> = new Set([301, 302, 303, 307, 308]);

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
 * @param location - The URL to which the response should redirect.
 * @param status - The HTTP status code for the redirection. Defaults to 302 (Found).
 *                 See: https://developer.mozilla.org/en-US/docs/Web/API/Response/redirect_static#status
 * @param headers - Additional headers to include in the response.
 * @returns A `Response` object representing the HTTP redirect.
 */
export function createRedirectResponse(
  location: string,
  status = 302,
  headers?: Record<string, string>,
): Response {
  if (ngDevMode && !isValidRedirectResponseCode(status)) {
    throw new Error(
      `Invalid redirect status code: ${status}. ` +
        `Please use one of the following redirect response codes: ${[...VALID_REDIRECT_RESPONSE_CODES.values()].join(', ')}.`,
    );
  }

  const resHeaders = new Headers(headers);
  if (ngDevMode && resHeaders.has('location')) {
    // eslint-disable-next-line no-console
    console.warn(
      `Location header "${resHeaders.get('location')}" will ignored and set to "${location}".`,
    );
  }

  let vary = resHeaders.get('Vary') ?? '';
  if (vary) {
    vary += ', ';
  }
  vary += 'X-Forwarded-Prefix';

  resHeaders.set('Vary', vary);
  resHeaders.set('Location', location);

  return new Response(null, {
    status,
    headers: resHeaders,
  });
}
