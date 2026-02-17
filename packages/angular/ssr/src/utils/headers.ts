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
 * Regular expression to match and remove the `www.` prefix from hostnames.
 */
const WWW_HOST_REGEX = /^www\./i;

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
export function validateHeaders(request: Request, allowedHosts: ReadonlySet<string>): void {
  const headers = request.headers;
  validateHost('x-forwarded-host', headers, allowedHosts);
  validateHost('host', headers, allowedHosts);

  const xForwardedPort = getFirstHeaderValue(headers.get('x-forwarded-port'));
  if (xForwardedPort && !VALID_PORT_REGEX.test(xForwardedPort)) {
    throw new Error('Header "x-forwarded-port" must be a numeric value.');
  }

  const xForwardedProto = getFirstHeaderValue(headers.get('x-forwarded-proto'));
  if (xForwardedProto && !VALID_PROTO_REGEX.test(xForwardedProto)) {
    throw new Error('Header "x-forwarded-proto" must be either "http" or "https".');
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
function validateHost(
  headerName: string,
  headers: Headers,
  allowedHosts: ReadonlySet<string>,
): void {
  const value = getFirstHeaderValue(headers.get(headerName))?.replace(WWW_HOST_REGEX, '');
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
  if (
    // Check the provided allowed hosts first.
    allowedHosts.has(hostname) ||
    checkWildcardHostnames(hostname, allowedHosts) ||
    // Check the default allowed hosts last this is the fallback and should be rarely if ever used in production.
    DEFAULT_ALLOWED_HOSTS.has(hostname) ||
    checkWildcardHostnames(hostname, DEFAULT_ALLOWED_HOSTS)
  ) {
    return;
  }

  let errorMessage = `Header "${headerName}" with value "${value}" is not allowed.`;
  if (typeof ngDevMode === 'undefined' || ngDevMode) {
    errorMessage +=
      '\n\nAction Required: Update your "angular.json" to include this hostname. ' +
      'Path: "projects.[project-name].architect.build.options.security.allowedHosts".';
  }

  throw new Error(errorMessage);
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
