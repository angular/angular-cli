/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Http2Server,
  IncomingHttpHeaders,
  IncomingHttpStatusHeader,
  connect,
  createServer,
} from 'node:http2';
import { AddressInfo } from 'node:net';
import { writeResponseToNodeResponse } from '../src/response';

describe('writeResponseToNodeResponse (HTTP/2)', () => {
  let server: Http2Server;
  function simulateResponse(res: Response): Promise<{
    body: string | null;
    headers: IncomingHttpHeaders & IncomingHttpStatusHeader;
    statusCode: number | undefined;
  }> {
    server.once('request', (req, nodeResponse) => {
      void writeResponseToNodeResponse(res, nodeResponse);
    });

    const { port } = server.address() as AddressInfo;
    const client = connect(`http://localhost:${port}`);

    return new Promise<{
      body: string | null;
      headers: IncomingHttpHeaders & IncomingHttpStatusHeader;
      statusCode: number | undefined;
    }>((resolve, reject) => {
      const req = client.request({
        ':path': '/',
      });

      req.once('response', (headers) => {
        let body: string | null = null;

        req
          .on('data', (chunk) => {
            body ??= '';
            body += chunk;
          })
          .on('end', () => resolve({ headers, statusCode: headers[':status'], body }))
          .on('error', reject);
      });
    }).finally(() => {
      client.close();
    });
  }

  beforeAll((done) => {
    server = createServer();
    server.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should write status, headers, and body to Node.js response', async () => {
    const { headers, statusCode, body } = await simulateResponse(
      new Response('Hello, world!', {
        status: 201,
        headers: {
          'Content-Type': 'text/plain',
          'X-Custom-Header': 'custom-value',
        },
      }),
    );

    expect(statusCode).toBe(201);
    expect(headers['content-type']).toBe('text/plain');
    expect(headers['x-custom-header']).toBe('custom-value');
    expect(body).toBe('Hello, world!');
  });

  it('should handle empty body', async () => {
    const { statusCode, body } = await simulateResponse(
      new Response(null, {
        status: 204,
      }),
    );

    expect(statusCode).toBe(204);
    expect(body).toBeNull();
  });

  it('should handle JSON content types', async () => {
    const jsonData = JSON.stringify({ message: 'Hello JSON' });
    const { statusCode, body } = await simulateResponse(
      new Response(jsonData, {
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(statusCode).toBe(200);
    expect(body).toBe(jsonData);
  });

  it('should set cookies on the ServerResponse', async () => {
    const cookieValue: string[] = [
      'myCookie=myValue; Path=/; HttpOnly',
      'anotherCookie=anotherValue; Path=/test',
    ];

    const headers = new Headers();
    cookieValue.forEach((v) => headers.append('set-cookie', v));
    const { headers: resHeaders } = await simulateResponse(new Response(null, { headers }));

    expect(resHeaders['set-cookie']).toEqual(cookieValue);
  });
});
