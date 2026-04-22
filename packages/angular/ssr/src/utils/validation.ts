/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * The set of headers that should be validated for host header injection attacks.
 */
const HOST_HEADERS_TO_VALIDATE: ReadonlyArray<string> = ['host', 'x-forwarded-host'];

/**
 * Regular expression to validate that the port is a numeric value.
 */
const VALID_PORT_REGEX = /^\d+$/;

/**
 * Regular expression to validate that the protocol is either http or https (case-insensitive).
 */
const VALID_PROTO_REGEX = /^https?$/i;

/**
 * Regular expression to validate that the prefix is valid.
 */
const VALID_PREFIX_REGEX = /^\/([a-z0-9_-]+\/)*[a-z0-9_-]*$/i;

/**
 * Extracts the first value from a multi-value header string.
 *
 * @param value - A string or an array of strings representing the header values.
 *                If it's a string, values are expected to be comma-separated.
 * @returns The first trimmed value from the multi-value header, or `undefined` if the input is invalid or empty.
 *
 * @example
 * ```typescript
 * getFirstHeaderValue("value1, value2, value3"); // "value1"
 * getFirstHeaderValue(["value1", "value2"]); // "value1"
 * getFirstHeaderValue(undefined); // undefined
 * ```
 */
export function getFirstHeaderValue(
  value: string | string[] | undefined | null,
): string | undefined {
  return value?.toString().split(',', 1)[0]?.trim();
}

/**
 * Validates a request.
 *
 * @param request - The incoming `Request` object to validate.
 * @param allowedHosts - A set of allowed hostnames.
 * @param disableHostCheck - Whether to disable the host check.
 * @throws Error if any of the validated headers contain invalid values.
 */
export function validateRequest(
  request: Request,
  allowedHosts: ReadonlySet<string>,
  disableHostCheck: boolean,
): void {
  validateHeaders(request, allowedHosts, disableHostCheck);

  if (!disableHostCheck) {
    validateUrl(new URL(request.url), allowedHosts);
  }
}

/**
 * Validates that the hostname of a given URL is allowed.
 *
 * @param url - The URL object to validate.
 * @param allowedHosts - A set of allowed hostnames.
 * @throws Error if the hostname is not in the allowlist.
 */
export function validateUrl(url: URL, allowedHosts: ReadonlySet<string>): void {
  const { hostname } = url;
  if (!isHostAllowed(hostname, allowedHosts)) {
    throw new Error(`URL with hostname "${hostname}" is not allowed.`);
  }
}

/**
 * Sanitizes the proxy headers of a request by removing unallowed `X-Forwarded-*` headers.
 * If no headers need to be removed, the original request is returned without cloning.
 *
 * @param request - The incoming `Request` object to sanitize.
 * @param trustProxyHeaders - A set of allowed proxy headers or a boolean indicating whether all are allowed.
 * @returns The sanitized request, or the original request if no changes were needed.
 */
export function sanitizeRequestHeaders(
  request: Request,
  trustProxyHeaders: boolean | ReadonlySet<string> | undefined,
): Request {
  let receivedXForwarded = false;
  const keysToDelete: string[] = [];
  let deoptToCSR = false;

  for (const [key] of request.headers) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('x-forwarded-')) {
      receivedXForwarded = true;

      if (trustProxyHeaders === true) {
        continue;
      }

      if (trustProxyHeaders === undefined) {
        if (lowerKey === 'x-forwarded-host' || lowerKey === 'x-forwarded-proto') {
          continue;
        }
        if (lowerKey === 'x-forwarded-prefix') {
          deoptToCSR = true;
          continue;
        }
      } else if (trustProxyHeaders !== false && trustProxyHeaders.has(lowerKey)) {
        continue;
      }

      keysToDelete.push(key);
    }
  }

  if (trustProxyHeaders === undefined && receivedXForwarded) {
    // eslint-disable-next-line no-console
    console.warn('Received "X-Forwarded-*" headers but "trustProxyHeaders" was not configured.');
  }

  if (keysToDelete.length === 0 && !deoptToCSR) {
    return request;
  }

  const clonedReq = new Request(request.clone(), {
    signal: request.signal,
  });

  const headers = clonedReq.headers;
  for (const key of keysToDelete) {
    headers.delete(key);
  }

  if (deoptToCSR) {
    headers.set('x-angular-deopt-csr', 'true');
  }

  return clonedReq;
}

/**
 * Validates a specific host header value against the allowed hosts.
 *
 * @param headerName - The name of the header to validate (e.g., 'host', 'x-forwarded-host').
 * @param headerValue - The value of the header to validate.
 * @param allowedHosts - A set of allowed hostnames.
 * @throws Error if the header value is invalid or the hostname is not in the allowlist.
 */
function verifyHostAllowed(
  headerName: string,
  headerValue: string,
  allowedHosts: ReadonlySet<string>,
): void {
  const url = `http://${headerValue}`;
  if (!URL.canParse(url)) {
    throw new Error(`Header "${headerName}" contains an invalid value and cannot be parsed.`);
  }

  const { hostname, pathname, search, hash, username, password } = new URL(url);
  if (pathname !== '/' || search || hash || username || password) {
    throw new Error(
      `Header "${headerName}" with value "${headerValue}" contains characters that are not allowed.`,
    );
  }

  if (!isHostAllowed(hostname, allowedHosts)) {
    throw new Error(`Header "${headerName}" with value "${headerValue}" is not allowed.`);
  }
}

/**
 * Checks if the hostname is allowed.
 * @param hostname - The hostname to check.
 * @param allowedHosts - A set of allowed hostnames.
 * @returns `true` if the hostname is allowed, `false` otherwise.
 */
function isHostAllowed(hostname: string, allowedHosts: ReadonlySet<string>): boolean {
  if (allowedHosts.has('*') || allowedHosts.has(hostname)) {
    return true;
  }

  for (const allowedHost of allowedHosts) {
    if (!allowedHost.startsWith('*.')) {
      continue;
    }

    const domain = allowedHost.slice(1);
    if (hostname.endsWith(domain)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates the headers of an incoming request.
 *
 * @param request - The incoming `Request` object containing the headers to validate.
 * @param allowedHosts - A set of allowed hostnames.
 * @param disableHostCheck - Whether to disable the host check.
 * @throws Error if any of the validated headers contain invalid values.
 */
function validateHeaders(
  request: Request,
  allowedHosts: ReadonlySet<string>,
  disableHostCheck: boolean,
): void {
  const headers = request.headers;
  for (const headerName of HOST_HEADERS_TO_VALIDATE) {
    const headerValue = getFirstHeaderValue(headers.get(headerName));
    if (headerValue && !disableHostCheck) {
      verifyHostAllowed(headerName, headerValue, allowedHosts);
    }
  }

  const xForwardedPort = getFirstHeaderValue(headers.get('x-forwarded-port'));
  if (xForwardedPort && !VALID_PORT_REGEX.test(xForwardedPort)) {
    throw new Error('Header "x-forwarded-port" must be a numeric value.');
  }

  const xForwardedProto = getFirstHeaderValue(headers.get('x-forwarded-proto'));
  if (xForwardedProto && !VALID_PROTO_REGEX.test(xForwardedProto)) {
    throw new Error('Header "x-forwarded-proto" must be either "http" or "https".');
  }

  const xForwardedPrefix = getFirstHeaderValue(headers.get('x-forwarded-prefix'));
  if (xForwardedPrefix && !VALID_PREFIX_REGEX.test(xForwardedPrefix)) {
    throw new Error(
      'Header "x-forwarded-prefix" is invalid. It must start with a "/" and contain ' +
        'only alphanumeric characters, hyphens, and underscores, separated by single slashes.',
    );
  }
}
