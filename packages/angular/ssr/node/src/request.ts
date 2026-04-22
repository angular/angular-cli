/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';
import { getFirstHeaderValue } from '../../src/utils/validation';

/**
 * A set containing all the pseudo-headers defined in the HTTP/2 specification.
 *
 * This set can be used to filter out pseudo-headers from a list of headers,
 * as they are not allowed to be set directly using the `Node.js` Undici API or
 * the web `Headers` API.
 */
const HTTP2_PSEUDO_HEADERS: ReadonlySet<string> = new Set([
  ':method',
  ':scheme',
  ':authority',
  ':path',
  ':status',
]);

/**
 * Converts a Node.js `IncomingMessage` or `Http2ServerRequest` into a
 * Web Standard `Request` object.
 *
 * This function adapts the Node.js request objects to a format that can
 * be used by web platform APIs.
 *
 * @param nodeRequest - The Node.js request object (`IncomingMessage` or `Http2ServerRequest`) to convert.
 * @param trustProxyHeaders - A boolean or an array of allowed proxy headers.
 *
 * @remarks
 * When `trustProxyHeaders` is enabled, headers such as `X-Forwarded-Host` and
 * `X-Forwarded-Prefix` should ideally be strictly validated at a higher infrastructure
 * level (e.g., at the reverse proxy or API gateway) before reaching the application.
 *
 * @returns A Web Standard `Request` object.
 */
export function createWebRequestFromNodeRequest(
  nodeRequest: IncomingMessage | Http2ServerRequest,
  trustProxyHeaders?: boolean | readonly string[],
): Request {
  const trustProxyHeadersNormalized =
    trustProxyHeaders && typeof trustProxyHeaders !== 'boolean'
      ? new Set(trustProxyHeaders.map((h) => h.toLowerCase()))
      : trustProxyHeaders;

  const { headers, method = 'GET' } = nodeRequest;
  const withBody = method !== 'GET' && method !== 'HEAD';
  const referrer = headers.referer && URL.canParse(headers.referer) ? headers.referer : undefined;

  return new Request(createRequestUrl(nodeRequest, trustProxyHeadersNormalized), {
    method,
    headers: createRequestHeaders(headers, trustProxyHeadersNormalized),
    body: withBody ? nodeRequest : undefined,
    duplex: withBody ? 'half' : undefined,
    referrer,
  });
}

/**
 * Creates a `Headers` object from Node.js `IncomingHttpHeaders`.
 *
 * @param nodeHeaders - The Node.js `IncomingHttpHeaders` object to convert.
 * @param trustProxyHeaders - A boolean or a set of allowed proxy headers.
 * @returns A `Headers` object containing the converted headers.
 */
function createRequestHeaders(
  nodeHeaders: IncomingHttpHeaders,
  trustProxyHeaders: boolean | ReadonlySet<string> | undefined,
): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (HTTP2_PSEUDO_HEADERS.has(name)) {
      continue;
    }

    if (
      name.toLowerCase().startsWith('x-forwarded-') &&
      !isProxyHeaderAllowed(name.toLowerCase(), trustProxyHeaders)
    ) {
      continue;
    }

    if (typeof value === 'string') {
      headers.append(name, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    }
  }

  return headers;
}

/**
 * Creates a `URL` object from a Node.js `IncomingMessage`, taking into account the protocol, host, and port.
 *
 * @param nodeRequest - The Node.js `IncomingMessage` or `Http2ServerRequest` object to extract URL information from.
 * @param trustProxyHeaders - A boolean or a set of allowed proxy headers.
 *
 * @remarks
 * When `trustProxyHeaders` is enabled, headers such as `X-Forwarded-Host` and
 * `X-Forwarded-Prefix` should ideally be strictly validated at a higher infrastructure
 * level (e.g., at the reverse proxy or API gateway) before reaching the application.
 *
 * @returns A `URL` object representing the request URL.
 */
export function createRequestUrl(
  nodeRequest: IncomingMessage | Http2ServerRequest,
  trustProxyHeaders?: boolean | ReadonlySet<string>,
): URL {
  const {
    headers,
    socket,
    url = '',
    originalUrl,
  } = nodeRequest as IncomingMessage & { originalUrl?: string };

  const protocol =
    getAllowedProxyHeaderValue(headers, 'x-forwarded-proto', trustProxyHeaders) ??
    ('encrypted' in socket && socket.encrypted ? 'https' : 'http');

  const hostname =
    getAllowedProxyHeaderValue(headers, 'x-forwarded-host', trustProxyHeaders) ??
    headers.host ??
    headers[':authority'];

  if (Array.isArray(hostname)) {
    throw new Error('host value cannot be an array.');
  }

  let hostnameWithPort = hostname;
  if (!hostname?.includes(':')) {
    const port = getAllowedProxyHeaderValue(headers, 'x-forwarded-port', trustProxyHeaders);
    if (port) {
      hostnameWithPort += `:${port}`;
    }
  }

  return new URL(`${protocol}://${hostnameWithPort}${originalUrl ?? url}`);
}

/**
 * Gets the first value of an allowed proxy header.
 *
 * @param headers - The Node.js incoming HTTP headers.
 * @param headerName - The name of the proxy header to retrieve.
 * @param trustProxyHeaders - A boolean or a set of allowed proxy headers.
 * @returns The value of the allowed proxy header, or `undefined` if not allowed or not present.
 */
function getAllowedProxyHeaderValue(
  headers: IncomingHttpHeaders,
  headerName: string,
  trustProxyHeaders: boolean | ReadonlySet<string> | undefined,
): string | undefined {
  return isProxyHeaderAllowed(headerName, trustProxyHeaders)
    ? getFirstHeaderValue(headers[headerName])
    : undefined;
}

/**
 * Checks if a specific proxy header is allowed.
 *
 * @param headerName - The name of the proxy header to check.
 * @param allowedProxyHeaders - A boolean or a set of allowed proxy headers.
 * @returns `true` if the header is allowed, `false` otherwise.
 */
function isProxyHeaderAllowed(
  headerName: string,
  trustProxyHeaders: boolean | ReadonlySet<string> | undefined,
): boolean {
  if (trustProxyHeaders === undefined) {
    const lower = headerName.toLowerCase();

    return lower === 'x-forwarded-host' || lower === 'x-forwarded-proto';
  }

  if (trustProxyHeaders === false) {
    return false;
  }

  if (trustProxyHeaders === true) {
    return true;
  }

  return trustProxyHeaders.has(headerName.toLowerCase());
}
