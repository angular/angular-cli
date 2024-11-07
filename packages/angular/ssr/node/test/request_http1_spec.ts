/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { IncomingMessage, Server, ServerResponse, createServer, request } from 'node:http';
import { AddressInfo } from 'node:net';
import { createWebRequestFromNodeRequest } from '../src/request';

describe('createWebRequestFromNodeRequest (HTTP/1.1)', () => {
  let server: Server;
  let port: number;

  function extractNodeRequest(makeRequest: () => void): Promise<IncomingMessage> {
    const nodeRequest = getNodeRequest();
    makeRequest();

    return nodeRequest;
  }

  async function getNodeRequest(): Promise<IncomingMessage> {
    const { req, res } = await new Promise<{ req: IncomingMessage; res: ServerResponse }>(
      (resolve) => {
        server.once('request', (req, res) => resolve({ req, res }));
      },
    );

    res.end();

    return req;
  }

  beforeAll((done) => {
    server = createServer();
    server.listen(0, () => {
      port = (server.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET Handling', () => {
    it('should correctly handle a basic GET request', async () => {
      const nodeRequest = await extractNodeRequest(() => {
        request({
          host: 'localhost',
          port,
          path: '/basic-get',
          method: 'GET',
        }).end();
      });

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.method).toBe('GET');
      expect(webRequest.url).toBe(`http://localhost:${port}/basic-get`);
    });

    it('should correctly handle GET request with query parameters', async () => {
      const nodeRequest = await extractNodeRequest(() => {
        request({
          host: 'localhost',
          port,
          path: '/search?query=hello&page=2',
          method: 'GET',
        }).end();
      });

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.method).toBe('GET');
      expect(webRequest.url).toBe(`http://localhost:${port}/search?query=hello&page=2`);
    });

    it('should correctly handle GET request with custom headers', async () => {
      const nodeRequest = await extractNodeRequest(() => {
        request({
          hostname: 'localhost',
          port,
          path: '/with-headers',
          method: 'GET',
          headers: {
            'X-Custom-Header1': 'value1',
            'X-Custom-Header2': 'value2',
          },
        }).end();
      });

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.method).toBe('GET');
      expect(webRequest.url).toBe(`http://localhost:${port}/with-headers`);
      expect(webRequest.headers.get('x-custom-header1')).toBe('value1');
      expect(webRequest.headers.get('x-custom-header2')).toBe('value2');
    });
  });

  describe('POST Handling', () => {
    it('should handle POST request with JSON body and correct response', async () => {
      const postData = JSON.stringify({ message: 'Hello from POST' });
      const nodeRequest = await extractNodeRequest(() => {
        const clientRequest = request({
          hostname: 'localhost',
          port,
          path: '/post-json',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        });
        clientRequest.write(postData);
        clientRequest.end();
      });

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.method).toBe('POST');
      expect(webRequest.url).toBe(`http://localhost:${port}/post-json`);
      expect(webRequest.headers.get('content-type')).toBe('application/json');
      expect(await webRequest.json()).toEqual({ message: 'Hello from POST' });
    });

    it('should handle POST request with empty text body', async () => {
      const postData = '';
      const nodeRequest = await extractNodeRequest(() => {
        const clientRequest = request({
          hostname: 'localhost',
          port,
          path: '/post-text',
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(postData),
          },
        });
        clientRequest.write(postData);
        clientRequest.end();
      });

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.method).toBe('POST');
      expect(webRequest.url).toBe(`http://localhost:${port}/post-text`);
      expect(webRequest.headers.get('content-type')).toBe('text/plain');
      expect(await webRequest.text()).toBe('');
    });
  });
});
