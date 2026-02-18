/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Regular expression to validate that the port is a numeric value.
 */
const VALID_PORT_REGEX = /^\d+$/;

/**
 * Regular expression to validate that the protocol is either http or https (case-insensitive).
 */
const VALID_PROTO_REGEX = /^https?$/i;

/**
 * Regular expression to match path separators.
 */
const PATH_SEPARATOR_REGEX = /[/\\]/;

/**
 * Set of hostnames that are always allowed.
 */
const DEFAULT_ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  '*.localhost',
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
]);

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
 * @throws Error if any of the validated headers contain invalid values.
 */
export function validateRequest(request: Request, allowedHosts: ReadonlySet<string>): void {
  validateHeaders(request, allowedHosts);
  validateUrl(new URL(request.url), allowedHosts);
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
    let errorMessage = `URL with hostname "${hostname}" is not allowed.`;
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      errorMessage +=
        '\n\nAction Required: Update your "angular.json" to include this hostname. ' +
        'Path: "projects.[project-name].architect.build.options.security.allowedHosts".' +
        '\n\nFor more information, see https://angular.dev/guide/ssr#configuring-allowed-hosts';
    }

    throw new Error(errorMessage);
  }
}

/**
 * Validates a specific host header value against the allowed hosts.
 *
 * @param headerName - The name of the header to validate (e.g., 'host', 'x-forwarded-host').
 * @param headers - The `Headers` object from the request.
 * @param allowedHosts - A set of allowed hostnames.
 * @throws Error if the header value is invalid or the hostname is not in the allowlist.
 */
function validateHostHeaders(
  headerName: string,
  headers: Headers,
  allowedHosts: ReadonlySet<string>,
): void {
  const value = getFirstHeaderValue(headers.get(headerName));
  if (!value) {
    return;
  }

  // Reject any hostname containing path separators - they're invalid.
  if (PATH_SEPARATOR_REGEX.test(value)) {
    throw new Error(`Header "${headerName}" contains path separators which is not allowed.`);
  }

  const url = `http://${value}`;
  if (!URL.canParse(url)) {
    throw new Error(`Header "${headerName}" contains an invalid value.`);
  }

  const { hostname } = new URL(url);
  if (!isHostAllowed(hostname, allowedHosts)) {
    let errorMessage = `Header "${headerName}" with value "${value}" is not allowed.`;
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      errorMessage +=
        '\n\nAction Required: Update your "angular.json" to include this hostname. ' +
        'Path: "projects.[project-name].architect.build.options.security.allowedHosts".' +
        '\n\nFor more information, see https://angular.dev/guide/ssr#configuring-allowed-hosts';
    }

    throw new Error(errorMessage);
  }
}

/**
 * Checks if the hostname is allowed.
 * @param hostname - The hostname to check.
 * @param allowedHosts - A set of allowed hostnames.
 * @returns `true` if the hostname is allowed, `false` otherwise.
 */
export function isHostAllowed(hostname: string, allowedHosts: ReadonlySet<string>): boolean {
  return (
    // Check the provided allowed hosts first.
    allowedHosts.has(hostname) ||
    checkWildcardHostnames(hostname, allowedHosts) ||
    // Check the default allowed hosts last this is the fallback and should be rarely if ever used in production.
    DEFAULT_ALLOWED_HOSTS.has(hostname) ||
    checkWildcardHostnames(hostname, DEFAULT_ALLOWED_HOSTS)
  );
}

/**
 * Checks if the hostname matches any of the wildcard hostnames in the allowlist.
 * @param hostname - The hostname to check.
 * @param allowedHosts - A set of allowed hostnames.
 * @returns `true` if the hostname matches any of the wildcard hostnames, `false` otherwise.
 */
function checkWildcardHostnames(hostname: string, allowedHosts: ReadonlySet<string>): boolean {
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
 * This function checks for the validity of critical headers such as `x-forwarded-host`,
 *  `host`, `x-forwarded-port`, and `x-forwarded-proto`.
 * It ensures that the hostnames match the allowed hosts and that ports and protocols adhere to expected formats.
 *
 * @param request - The incoming `Request` object containing the headers to validate.
 * @param allowedHosts - A set of allowed hostnames.
 * @throws Error if any of the validated headers contain invalid values.
 */
function validateHeaders(request: Request, allowedHosts: ReadonlySet<string>): void {
  const headers = request.headers;
  validateHostHeaders('x-forwarded-host', headers, allowedHosts);
  validateHostHeaders('host', headers, allowedHosts);

  const xForwardedPort = getFirstHeaderValue(headers.get('x-forwarded-port'));
  if (xForwardedPort && !VALID_PORT_REGEX.test(xForwardedPort)) {
    throw new Error('Header "x-forwarded-port" must be a numeric value.');
  }

  const xForwardedProto = getFirstHeaderValue(headers.get('x-forwarded-proto'));
  if (xForwardedProto && !VALID_PROTO_REGEX.test(xForwardedProto)) {
    throw new Error('Header "x-forwarded-proto" must be either "http" or "https".');
  }
}
