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
export const VALID_REDIRECT_RESPONSE_CODES: ReadonlySet<number> = new Set([
  301, 302, 303, 307, 308,
]);

/**
 * The default maximum length of the `Location` header in redirect responses.
 *
 * Redirect locations can contain data from the request, such as the path, the query string and
 * the `X-Forwarded-Prefix` header, which the Angular router can encode into a longer string than
 * it received. Reverse proxies read the response headers into a buffer of limited size (4 KB by
 * default in NGINX) and fail the request when they do not fit. The default leaves room in such a
 * buffer for the status line and the other response headers.
 */
export const DEFAULT_MAX_REDIRECT_LOCATION_LENGTH = 2048;

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
 * @param maxLocationLength - The maximum allowed length of the location. When the location is
 *                            longer, a 400 (Bad Request) response is returned instead. When not
 *                            provided, the length of the location is not limited.
 * @returns A `Response` object representing the HTTP redirect.
 */
export function createRedirectResponse(
  location: string,
  status = 302,
  headers?: Record<string, string> | Headers,
  maxLocationLength?: number,
): Response {
  if (ngDevMode && !isValidRedirectResponseCode(status)) {
    throw new Error(
      `Invalid redirect status code: ${status}. ` +
        `Please use one of the following redirect response codes: ${[...VALID_REDIRECT_RESPONSE_CODES.values()].join(', ')}.`,
    );
  }

  if (maxLocationLength !== undefined && location.length > maxLocationLength) {
    const errorMessage =
      `Redirect location is ${location.length} characters long, which exceeds ` +
      `the maximum allowed length of ${maxLocationLength} characters.`;

    // eslint-disable-next-line no-console
    console.error(
      `ERROR: Bad Request.\n${errorMessage}\n` +
        'The limit can be changed with the "maxRedirectLocationLength" option of "AngularAppEngine" or "AngularNodeAppEngine".',
    );

    return new Response(errorMessage, {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'Content-Type': 'text/plain' },
    });
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
  resHeaders.set('Location', location);

  return new Response(null, {
    status,
    headers: resHeaders,
  });
}
