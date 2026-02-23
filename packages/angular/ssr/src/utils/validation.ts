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
 * Regular expression to validate that the host is a valid hostname.
 */
const VALID_HOST_REGEX = /^[a-z0-9.:-]+$/i;

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
  validateHeaders(request);
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
    throw new Error(`URL with hostname "${hostname}" is not allowed.`);
  }
}

/**
 * Clones a request and patches the `get` method of the request headers to validate the host headers.
 * @param request - The request to validate.
 * @param allowedHosts - A set of allowed hostnames.
 * @returns An object containing the cloned request and a promise that resolves to an error
 * if any of the validated headers contain invalid values.
 */
export function cloneRequestAndPatchHeaders(
  request: Request,
  allowedHosts: ReadonlySet<string>,
): { request: Request; onError: Promise<Error> } {
  let onError: (value: Error) => void;
  const onErrorPromise = new Promise<Error>((resolve) => {
    onError = resolve;
  });

  const clonedReq = new Request(request.clone(), {
    signal: request.signal,
  });

  const headers = clonedReq.headers;

  const originalGet = headers.get;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  (headers.get as typeof originalGet) = function (name) {
    const value = originalGet.call(headers, name);
    if (!value) {
      return value;
    }

    validateHeader(name, value, allowedHosts, onError);

    return value;
  };

  const originalValues = headers.values;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  (headers.values as typeof originalValues) = function () {
    for (const name of HOST_HEADERS_TO_VALIDATE) {
      validateHeader(name, originalGet.call(headers, name), allowedHosts, onError);
    }

    return originalValues.call(headers);
  };

  const originalEntries = headers.entries;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  (headers.entries as typeof originalEntries) = function () {
    const iterator = originalEntries.call(headers);

    return {
      next() {
        const result = iterator.next();
        if (!result.done) {
          const [key, value] = result.value;
          validateHeader(key, value, allowedHosts, onError);
        }

        return result;
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  };

  // Ensure for...of loops use the new patched entries
  (headers[Symbol.iterator] as typeof originalEntries) = headers.entries;

  return { request: clonedReq, onError: onErrorPromise };
}

/**
 * Validates a specific header value against the allowed hosts.
 * @param name - The name of the header to validate.
 * @param value - The value of the header to validate.
 * @param allowedHosts - A set of allowed hostnames.
 * @param onError - A callback function to call if the header value is invalid.
 * @throws Error if the header value is invalid.
 */
function validateHeader(
  name: string,
  value: string | null,
  allowedHosts: ReadonlySet<string>,
  onError: (value: Error) => void,
): void {
  if (!value) {
    return;
  }

  if (!HOST_HEADERS_TO_VALIDATE.has(name.toLowerCase())) {
    return;
  }

  try {
    verifyHostAllowed(name, value, allowedHosts);
  } catch (error) {
    onError(error as Error);

    throw error;
  }
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
    throw new Error(`Header "${headerName}" with value "${value}" is not allowed.`);
  }
}

/**
 * Checks if the hostname is allowed.
 * @param hostname - The hostname to check.
 * @param allowedHosts - A set of allowed hostnames.
 * @returns `true` if the hostname is allowed, `false` otherwise.
 */
function isHostAllowed(hostname: string, allowedHosts: ReadonlySet<string>): boolean {
  if (allowedHosts.has(hostname)) {
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
 * @throws Error if any of the validated headers contain invalid values.
 */
function validateHeaders(request: Request): void {
  const headers = request.headers;
  for (const headerName of HOST_HEADERS_TO_VALIDATE) {
    const headerValue = getFirstHeaderValue(headers.get(headerName));
    if (headerValue && !VALID_HOST_REGEX.test(headerValue)) {
      throw new Error(`Header "${headerName}" contains characters that are not allowed.`);
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
