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
 * Checks if the given HTTP status code is a valid redirect response code.
 *
 * @param code The HTTP status code to check.
 * @returns `true` if the code is a valid redirect response code, `false` otherwise.
 */
export function isValidRedirectResponseCode(code: number): boolean {
  return VALID_REDIRECT_RESPONSE_CODES.has(code);
}

/**
 * Characters that must never appear in a statically-emitted redirect target or
 * in a value substituted into a prerendered URL. They are rejected during route
 * extraction so they cannot break out of generated HTML contexts or smuggle
 * markup through the route path.
 *
 * - C0 controls and DEL (`\u0000`-`\u001F`, `\u007F`) and whitespace
 * - Backslash (`\`) - not a valid URL path separator
 * - HTML-significant characters: `<`, `>`, `"`, `'`, `` ` ``
 */
const UNSAFE_URL_CHARACTERS_REGEXP = /[\\<>"'`]/;

function hasUnsafeUrlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const characterCode = value.charCodeAt(index);
    if (characterCode <= 0x20 || characterCode === 0x7f) {
      return true;
    }
  }

  return UNSAFE_URL_CHARACTERS_REGEXP.test(value);
}

/**
 * Validates that the given value is safe to embed in a generated redirect page
 * or to use as a prerendered URL path segment.
 *
 * Returns `undefined` when the value is safe, otherwise returns a human-readable
 * error message describing why it was rejected.
 */
export function validateUrlForStaticEmission(value: string): string | undefined {
  if (hasUnsafeUrlCharacters(value)) {
    return (
      `the value '${value}' contains characters that are not allowed in a statically ` +
      `emitted URL (control characters, whitespace, backslash, or HTML-significant characters).`
    );
  }

  return undefined;
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
  headers?: Record<string, string> | Headers,
): Response {
  if (ngDevMode && !isValidRedirectResponseCode(status)) {
    throw new Error(
      `Invalid redirect status code: ${status}. ` +
        `Please use one of the following redirect response codes: ${[...VALID_REDIRECT_RESPONSE_CODES.values()].join(', ')}.`,
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
  resHeaders.set('Location', location);

  return new Response(null, {
    status,
    headers: resHeaders,
  });
}
