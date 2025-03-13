/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ServerResponse } from 'node:http';
import type { Http2ServerResponse } from 'node:http2';

/**
 * Streams a web-standard `Response` into a Node.js `ServerResponse`
 * or `Http2ServerResponse`.
 *
 * This function adapts the web `Response` object to write its content
 * to a Node.js response object, handling both HTTP/1.1 and HTTP/2.
 *
 * @param source - The web-standard `Response` object to stream from.
 * @param destination - The Node.js response object (`ServerResponse` or `Http2ServerResponse`) to stream into.
 * @returns A promise that resolves once the streaming operation is complete.
 */
export async function writeResponseToNodeResponse(
  source: Response,
  destination: ServerResponse | Http2ServerResponse,
): Promise<void> {
  const { status, headers, body } = source;
  destination.statusCode = status;

  let cookieHeaderSet = false;
  for (const [name, value] of headers.entries()) {
    if (name === 'set-cookie') {
      if (cookieHeaderSet) {
        continue;
      }

      // Sets the 'set-cookie' header only once to ensure it is correctly applied.
      // Concatenating 'set-cookie' values can lead to incorrect behavior, so we use a single value from `headers.getSetCookie()`.
      destination.setHeader(name, headers.getSetCookie());
      cookieHeaderSet = true;
    } else {
      destination.setHeader(name, value);
    }
  }

  if ('flushHeaders' in destination) {
    destination.flushHeaders();
  }

  if (!body) {
    destination.end();

    return;
  }

  try {
    const reader = body.getReader();

    destination.on('close', () => {
      reader.cancel().catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          `An error occurred while writing the response body for: ${destination.req.url}.`,
          error,
        );
      });
    });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        destination.end();
        break;
      }

      const canContinue = (destination as ServerResponse).write(value);
      if (canContinue === false) {
        // Explicitly check for `false`, as AWS may return `undefined` even though this is not valid.
        // See: https://github.com/CodeGenieApp/serverless-express/issues/683
        await new Promise<void>((resolve) => destination.once('drain', resolve));
      }
    }
  } catch {
    destination.end('Internal server error.');
  }
}
