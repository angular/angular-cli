/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { IncomingMessage, Server, createServer, request as requestCb } from 'node:http';
import { AddressInfo } from 'node:net';
import { writeResponseToNodeResponse } from '../src/response';

describe('writeResponseToNodeResponse (HTTP/1.1)', () => {
  let server: Server;

  function simulateResponse(
    res: Response,
  ): Promise<{ response: IncomingMessage; body: string | null }> {
    server.once('request', (req, nodeResponse) => {
      void writeResponseToNodeResponse(res, nodeResponse);
    });

    return new Promise<{
      body: string | null;
      response: IncomingMessage;
    }>((resolve, reject) => {
      const { port } = server.address() as AddressInfo;
      const clientRequest = requestCb(
        {
          host: 'localhost',
          port,
        },
        (response) => {
          let body: string | null = null;
          response
            .on('data', (chunk) => {
              body ??= '';
              body += chunk;
            })
            .on('end', () => resolve({ response, body }))
            .on('error', reject);
        },
      );

      clientRequest.end();
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
    const { response, body } = await simulateResponse(
      new Response('Hello, world!', {
        status: 201,
        headers: {
          'Content-Type': 'text/plain',
          'X-Custom-Header': 'custom-value',
        },
      }),
    );

    expect(response.statusCode).toBe(201);
    expect(response.headers['content-type']).toBe('text/plain');
    expect(response.headers['x-custom-header']).toBe('custom-value');
    expect(body).toBe('Hello, world!');
  });

  it('should handle empty body', async () => {
    const { response, body } = await simulateResponse(
      new Response(null, {
        status: 204,
      }),
    );

    expect(response.statusCode).toBe(204);
    expect(body).toBeNull();
  });

  it('should handle JSON content types', async () => {
    const jsonData = JSON.stringify({ message: 'Hello JSON' });
    const { response, body } = await simulateResponse(
      new Response(jsonData, {
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(body).toBe(jsonData);
  });

  it('should set cookies on the ServerResponse', async () => {
    const cookieValue: string[] = [
      'myCookie=myValue; Path=/; HttpOnly',
      'anotherCookie=anotherValue; Path=/test',
    ];

    const headers = new Headers();
    cookieValue.forEach((v) => headers.append('set-cookie', v));
    const { response } = await simulateResponse(new Response(null, { headers }));

    expect(response.headers['set-cookie']).toEqual(cookieValue);
  });
});
