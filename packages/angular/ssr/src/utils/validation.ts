/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * The default set of allowed hosts.
 */
const DEFAULT_ALLOWED_HOSTS: ReadonlySet<string> = new Set(['localhost', '*.localhost']);

/**
 * The set of headers that should be validated for host header injection attacks.
 */
const HOST_HEADERS_TO_VALIDATE: ReadonlySet<string> = new Set(['host', 'x-forwarded-host']);

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
  validateUrl(new URL(request.url), allowedHosts);
  validateHeaders(request);
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
    const errorMessage =
      `URL with hostname "${hostname}" is not allowed.` +
      '\n\nFor more information, see https://angular.dev/best-practices/security#preventing-server-side-request-forgery-ssrf';

    throw new Error(errorMessage);
  }
}

/**
 * Secures a request by proxying it and validating the host headers.
 * @param request - The request to secure.
 * @param allowedHosts - The set of allowed hosts.
 * @returns A proxy of the request with host headers validated.
 */
export function secureRequest(request: Request, allowedHosts: ReadonlySet<string>): Request {
  return new Proxy(request, {
    get(target, prop) {
      if (prop !== 'headers') {
        const value = Reflect.get(target, prop);

        return typeof value === 'function' ? value.bind(target) : value;
      }

      const headersTarget = target.headers;

      return new Proxy(headersTarget, {
        get(headersTarget, headersProperty) {
          const method = Reflect.get(headersTarget, headersProperty);
          if (headersProperty === 'get') {
            return (name: string) => {
              const value = headersTarget.get(name);
              if (!value) {
                return value;
              }

              const key = name.toLowerCase();
              if (HOST_HEADERS_TO_VALIDATE.has(key)) {
                verifyHostAllowed(key, value, allowedHosts);
              }

              return value;
            };
          }

          return typeof method === 'function' ? method.bind(headersTarget) : method;
        },
      });
    },
  });
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
  const value = getFirstHeaderValue(headerValue);
  if (!value) {
    return;
  }

  const url = `http://${value}`;
  if (!URL.canParse(url)) {
    throw new Error(`Header "${headerName}" contains an invalid value and cannot be parsed.`);
  }

  const { hostname } = new URL(url);
  if (!isHostAllowed(hostname, allowedHosts)) {
    const errorMessage =
      `Header "${headerName}" with value "${value}" is not allowed.` +
      '\n\nFor more information, see https://angular.dev/best-practices/security#preventing-server-side-request-forgery-ssrf';

    throw new Error(errorMessage);
  }
}

/**
 * Checks if the hostname is allowed.
 * @param hostname - The hostname to check.
 * @param allowedHosts - A set of allowed hostnames.
 * @returns `true` if the hostname is allowed, `false` otherwise.
 */
function isHostAllowed(hostname: string, allowedHosts: ReadonlySet<string>): boolean {
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
 * @param request - The incoming `Request` object containing the headers to validate.
 * @throws Error if any of the validated headers contain invalid values.
 */
function validateHeaders(request: Request): void {
  const headers = request.headers;
  for (const headerName of HOST_HEADERS_TO_VALIDATE) {
    const headerValue = getFirstHeaderValue(headers.get(headerName));

    // Reject any hostname containing path separators - they're invalid.
    if (headerValue && PATH_SEPARATOR_REGEX.test(headerValue)) {
      throw new Error(`Header "${headerName}" contains path separators which is not allowed.`);
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
}
