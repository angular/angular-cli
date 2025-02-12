/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';

/**
 * A set containing all the pseudo-headers defined in the HTTP/2 specification.
 *
 * This set can be used to filter out pseudo-headers from a list of headers,
 * as they are not allowed to be set directly using the `Node.js` Undici API or
 * the web `Headers` API.
 */
const HTTP2_PSEUDO_HEADERS = new Set([':method', ':scheme', ':authority', ':path', ':status']);

/**
 * Converts a Node.js `IncomingMessage` or `Http2ServerRequest` into a
 * Web Standard `Request` object.
 *
 * This function adapts the Node.js request objects to a format that can
 * be used by web platform APIs.
 *
 * @param nodeRequest - The Node.js request object (`IncomingMessage` or `Http2ServerRequest`) to convert.
 * @returns A Web Standard `Request` object.
 * @developerPreview
 */
export function createWebRequestFromNodeRequest(
  nodeRequest: IncomingMessage | Http2ServerRequest,
): Request {
  const { headers, method = 'GET' } = nodeRequest;
  const withBody = method !== 'GET' && method !== 'HEAD';

  return new Request(createRequestUrl(nodeRequest), {
    method,
    headers: createRequestHeaders(headers),
    body: withBody ? nodeRequest : undefined,
    duplex: withBody ? 'half' : undefined,
  });
}

/**
 * Creates a `Headers` object from Node.js `IncomingHttpHeaders`.
 *
 * @param nodeHeaders - The Node.js `IncomingHttpHeaders` object to convert.
 * @returns A `Headers` object containing the converted headers.
 */
function createRequestHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (HTTP2_PSEUDO_HEADERS.has(name)) {
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
 * @returns A `URL` object representing the request URL.
 */
function createRequestUrl(nodeRequest: IncomingMessage | Http2ServerRequest): URL {
  const {
    headers,
    socket,
    url = '',
    originalUrl,
  } = nodeRequest as IncomingMessage & { originalUrl?: string };
  const protocol =
    getFirstHeaderValue(headers['x-forwarded-proto']) ??
    ('encrypted' in socket && socket.encrypted ? 'https' : 'http');
  const hostname =
    getFirstHeaderValue(headers['x-forwarded-host']) ?? headers.host ?? headers[':authority'];

  if (Array.isArray(hostname)) {
    throw new Error('host value cannot be an array.');
  }

  let hostnameWithPort = hostname;
  if (!hostname?.includes(':')) {
    const port = getFirstHeaderValue(headers['x-forwarded-port']);
    if (port) {
      hostnameWithPort += `:${port}`;
    }
  }

  return new URL(originalUrl ?? url, `${protocol}://${hostnameWithPort}`);
}

/**
 * Extracts the first value from a multi-value header string.
 *
 * @param value - A string or an array of strings representing the header values.
 *                           If it's a string, values are expected to be comma-separated.
 * @returns The first trimmed value from the multi-value header, or `undefined` if the input is invalid or empty.
 *
 * @example
 * ```typescript
 * getFirstHeaderValue("value1, value2, value3"); // "value1"
 * getFirstHeaderValue(["value1", "value2"]); // "value1"
 * getFirstHeaderValue(undefined); // undefined
 * ```
 */
function getFirstHeaderValue(value: string | string[] | undefined): string | undefined {
  return value?.toString().split(',', 1)[0]?.trim();
}
