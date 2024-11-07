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
    headers['x-forwarded-proto'] ?? ('encrypted' in socket && socket.encrypted ? 'https' : 'http');
  const hostname = headers['x-forwarded-host'] ?? headers.host ?? headers[':authority'];
  const port = headers['x-forwarded-port'] ?? socket.localPort;

  if (Array.isArray(hostname)) {
    throw new Error('host value cannot be an array.');
  }

  let hostnameWithPort = hostname;
  if (port && !hostname?.includes(':')) {
    hostnameWithPort += `:${port}`;
  }

  return new URL(originalUrl ?? url, `${protocol}://${hostnameWithPort}`);
}
