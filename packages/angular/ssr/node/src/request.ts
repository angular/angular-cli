/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

/**
 * Converts a Node.js `IncomingMessage` into a Web Standard `Request`.
 *
 * @param nodeRequest - The Node.js `IncomingMessage` object to convert.
 * @returns A Web Standard `Request` object.
 * @developerPreview
 */
export function createWebRequestFromNodeRequest(nodeRequest: IncomingMessage): Request {
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
 * @param nodeRequest - The Node.js `IncomingMessage` object to extract URL information from.
 * @returns A `URL` object representing the request URL.
 */
function createRequestUrl(nodeRequest: IncomingMessage): URL {
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
