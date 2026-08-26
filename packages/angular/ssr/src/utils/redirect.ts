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
 * Base URL used to resolve relative values with the WHATWG URL parser.
 *
 * Any origin works; a loopback address is used so that a value which manages to change the
 * origin is trivially detectable.
 */
const RELATIVE_URL_BASE = 'http://127.0.0.1';

/**
 * Protocols that are supported as the target of a redirect.
 */
const ALLOWED_REDIRECT_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/**
 * Matches the URL syntax characters that a route segment must not contain once it has been
 * percent-decoded. `/` and `\` are separators and `?`, `#` and `%` are URL syntax, so a segment
 * which decodes into any of them is no longer the single segment that was validated.
 */
const UNSAFE_DECODED_SEGMENT_REGEXP = /[\\/?#%]/;

/**
 * Determines whether a percent-decoded route segment can still be used as a single path segment.
 *
 * Control characters are rejected in addition to the URL syntax characters, as they are valid
 * neither in a URL nor in the directory that the prerendered page is written to.
 *
 * @param segment - The decoded segment to check.
 * @returns `true` when the segment cannot be used as a path segment.
 */
function isUnsafeDecodedSegment(segment: string): boolean {
  if (UNSAFE_DECODED_SEGMENT_REGEXP.test(segment)) {
    return true;
  }

  for (let index = 0; index < segment.length; index++) {
    const code = segment.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }

  return false;
}

/**
 * The outcome of normalizing a URL value: either the normalized value, or the reason the value
 * was rejected. Exactly one of `url` and `error` is set.
 */
export type NormalizedUrl = { url: string; error?: undefined } | { url?: undefined; error: string };

/**
 * Parses a value that has to stay within the application origin.
 *
 * Normalization is delegated to the WHATWG URL parser, which percent-encodes characters that are
 * unsafe in a path (spaces, `<`, `>`, `"`, control characters, ...) and collapses `.` and `..`
 * segments, while leaving characters that are legal in a path, such as apostrophes, untouched.
 *
 * The returned URL is guaranteed to resolve to the application origin and to have a path which
 * cannot be read as protocol-relative.
 *
 * @param value - The value to parse, for example `/docs/a b`.
 * @returns The parsed URL, or the reason the value was rejected.
 */
function parseSameOriginUrl(
  value: string,
): { url: URL; error?: undefined } | { url?: undefined; error: string } {
  // The URL parser treats a leading `//` as an authority and normalizes backslashes to forward
  // slashes for special schemes. Both allow a value to silently point at a different origin.
  if (value.startsWith('//') || value.includes('\\')) {
    return {
      error:
        `'${value}' is not a valid same-origin path. ` +
        `Protocol-relative paths ('//') and backslashes ('\\') are not supported.`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value, RELATIVE_URL_BASE);
  } catch {
    return { error: `'${value}' could not be parsed as a URL.` };
  }

  if (parsed.origin !== RELATIVE_URL_BASE) {
    return { error: `'${value}' resolves outside of the application origin.` };
  }

  // The parser resolves `.` and `..` segments, so a value which passed the check above can still
  // come back with a leading `//`. The origin is unchanged when that happens, which means neither
  // check so far rejects it, yet the resulting path is read as an authority by everything the
  // value is handed to. The check is therefore repeated on the parsed path.
  if (parsed.pathname.startsWith('//')) {
    return {
      error:
        `'${value}' is not a valid same-origin path. ` +
        `It resolves to the protocol-relative path '${parsed.pathname}'.`,
    };
  }

  return { url: parsed };
}

/**
 * Normalizes and validates the path that a route is prerendered under.
 *
 * On top of the same-origin normalization, the path has to survive the round trip it makes through
 * the route tree: `RouteTree` percent-decodes every segment when a route is inserted, and decodes
 * it again on the server when the serialized tree is restored. A segment is therefore only accepted
 * when decoding it succeeds, yields a plain path segment, and leaves nothing further to decode.
 * Dot segments are rejected rather than resolved, because a route which is prerendered somewhere
 * other than where it is defined would silently overwrite the output of another route.
 *
 * @param path - The path to normalize, for example `/store/summer sale`.
 * @returns The normalized path, or the reason it was rejected.
 */
export function normalizeAndValidateRoutePath(path: string): NormalizedUrl {
  const { url: parsed, error } = parseSameOriginUrl(path);
  if (error !== undefined) {
    return { error };
  }

  if (parsed.search || parsed.hash) {
    return {
      error: `'${path}' is not a valid route path. A route cannot carry a query string or a fragment.`,
    };
  }

  // Segments are validated on the value which was passed in rather than on the normalized pathname.
  // The URL parser resolves `.` and `..` segments, including their percent-encoded forms, which
  // would otherwise silently move the route to a completely different path.
  for (const segment of path.split('/')) {
    if (!segment) {
      continue;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return {
        error:
          `'${path}' is not a valid route path. ` +
          `The '${segment}' segment is not a valid percent-encoded value.`,
      };
    }

    if (decoded === '.' || decoded === '..') {
      return {
        error:
          `'${path}' is not a valid route path. ` +
          `The '${segment}' segment decodes to the '${decoded}' path traversal segment.`,
      };
    }

    if (isUnsafeDecodedSegment(decoded)) {
      return {
        error:
          `'${path}' is not a valid route path. ` +
          `The '${segment}' segment decodes to a value which is not a single path segment. ` +
          `Separators, the URL syntax characters '?', '#' and '%' and control characters are not supported.`,
      };
    }
  }

  return { url: parsed.pathname };
}

/**
 * Normalizes and validates a redirect target.
 *
 * Targets that carry a scheme must use HTTP(S). Anything else, such as `javascript:` or `data:`,
 * is rejected because the target is emitted verbatim into the `Location` header and into the
 * generated static redirect page. Schemeless targets are normalized as same-origin paths.
 *
 * @param target - The redirect target, for example `/home` or `https://example.com/docs`.
 * @returns The normalized target, or the reason the value was rejected.
 */
export function normalizeAndValidateRedirect(target: string): NormalizedUrl {
  // The value reaches this point straight from the route configuration, which is not necessarily
  // type checked, so a non-string is reported as a diagnostic rather than thrown as a `TypeError`.
  if (typeof target !== 'string') {
    return {
      error: `the redirect target must be a string, but a value of type '${typeof target}' was provided.`,
    };
  }

  if (!target.trim()) {
    return { error: 'the redirect target cannot be empty.' };
  }

  // A value which parses without a base is an absolute URL and therefore carries its own scheme.
  // Letting the URL parser answer this keeps the check exact: the scheme grammar, and the leading
  // whitespace and control characters that are stripped before it is applied, are all handled by
  // the parser rather than restated here.
  if (URL.canParse(target)) {
    const { protocol, href } = new URL(target);
    if (!ALLOWED_REDIRECT_PROTOCOLS.has(protocol)) {
      return {
        error:
          `the '${protocol}' protocol is not supported as a redirect target. ` +
          `Only 'http:', 'https:' and same-origin paths are supported.`,
      };
    }

    return { url: href };
  }

  const { url: parsed, error } = parseSameOriginUrl(target);

  return error !== undefined ? { error } : { url: parsed.pathname + parsed.search + parsed.hash };
}

/**
 * Creates an HTTP redirect response with a specified location and status code.
 *
 * This is the only place where a `Location` header is set, so the target is normalized and
 * validated here rather than only where it is configured. A location is not always a configured
 * value which route extraction has already checked: it can be produced by a guard at render time,
 * and it can be composed from the untrusted `X-Forwarded-Prefix` request header. The normalized
 * value is the one sent, so that the emitted header and the value which was checked are the same.
 *
 * @param location - The URL to which the response should redirect.
 * @param status - The HTTP status code for the redirection. Defaults to 302 (Found).
 *                 See: https://developer.mozilla.org/en-US/docs/Web/API/Response/redirect_static#status
 * @param headers - Additional headers to include in the response.
 * @returns A `Response` object representing the HTTP redirect.
 * @throws If `location` is not a supported redirect target.
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

  const { url: normalizedLocation, error } = normalizeAndValidateRedirect(location);
  if (error !== undefined) {
    throw new Error(`Cannot redirect to '${location}': ${error}`);
  }

  const resHeaders = headers instanceof Headers ? headers : new Headers(headers);
  if (ngDevMode && resHeaders.has('location')) {
    // eslint-disable-next-line no-console
    console.warn(
      `Location header "${resHeaders.get('location')}" will be ignored and set to "${normalizedLocation}".`,
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
