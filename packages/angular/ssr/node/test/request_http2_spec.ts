/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  ClientHttp2Session,
  Http2Server,
  Http2ServerRequest,
  Http2ServerResponse,
  connect,
  createServer,
} from 'node:http2';
import { AddressInfo } from 'node:net';
import { createWebRequestFromNodeRequest } from '../src/request';

describe('createWebRequestFromNodeRequest (HTTP/2)', () => {
  let server: Http2Server;
  let port: number;
  let client: ClientHttp2Session;

  function extractNodeRequest(makeRequest: () => void): Promise<Http2ServerRequest> {
    const nodeRequest = getNodeRequest();
    makeRequest();

    return nodeRequest;
  }

  async function getNodeRequest(): Promise<Http2ServerRequest> {
    const { req, res } = await new Promise<{
      req: Http2ServerRequest;
      res: Http2ServerResponse;
    }>((resolve) => {
      server.once('request', (req, res) => resolve({ req, res }));
    });

    res.end();

    return req;
  }

  beforeAll((done) => {
    server = createServer();
    server.listen(0, () => {
      port = (server.address() as AddressInfo).port;
      done();
      client = connect(`http://localhost:${port}`);
    });
  });

  afterAll((done) => {
    client.close();
    server.close(done);
  });

  describe('GET handling', () => {
    it('should correctly handle a basic GET request', async () => {
      const nodeRequest = await extractNodeRequest(() => {
        client
          .request({
            ':path': '/basic-get',
            ':method': 'GET',
          })
          .end();
      });

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.method).toBe('GET');
      expect(webRequest.url).toBe(`http://localhost:${port}/basic-get`);
    });

    it('should correctly handle GET request with query parameters', async () => {
      const nodeRequest = await extractNodeRequest(() => {
        client
          .request({
            ':scheme': 'http',
            ':path': '/search?query=hello&page=2',
            ':method': 'POST',
          })
          .end();
      });

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.method).toBe('POST');
      expect(webRequest.url).toBe(`http://localhost:${port}/search?query=hello&page=2`);
    });

    it('should correctly handle GET request with custom headers', async () => {
      const nodeRequest = await extractNodeRequest(() => {
        client
          .request({
            ':path': '/with-headers',
            ':method': 'GET',
            'X-Custom-Header1': 'value1',
            'X-Custom-Header2': 'value2',
          })
          .end();
      });

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.method).toBe('GET');
      expect(webRequest.url).toBe(`http://localhost:${port}/with-headers`);
      expect(webRequest.headers.get('x-custom-header1')).toBe('value1');
      expect(webRequest.headers.get('x-custom-header2')).toBe('value2');
    });

    it('should correctly handle the referer header', async () => {
      const referer = 'http://test-referer-site.com/page';
      const nodeRequest = await extractNodeRequest(() => {
        client
          .request({
            ':path': '/with-referer',
            ':method': 'GET',
            referer,
          })
          .end();
      });

      expect(nodeRequest.headers['referer']).toBe(referer);

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.headers.get('referer')).toBe(referer);
      expect(webRequest.referrer).toBe(referer);
      expect(webRequest.url).toBe(`http://localhost:${port}/with-referer`);
    });

    it('should handle an invalid referer header gracefully', async () => {
      const invalidReferer = '/invalid-referer';
      const nodeRequest = await extractNodeRequest(() => {
        client
          .request({
            ':path': '/with-referer',
            ':method': 'GET',
            referer: invalidReferer,
          })
          .end();
      });

      expect(nodeRequest.headers['referer']).toBe(invalidReferer);

      const webRequest = createWebRequestFromNodeRequest(nodeRequest);
      expect(webRequest.headers.get('referer')).toBe(invalidReferer);
      expect(webRequest.referrer).toBe('about:client');
    });
  });

  describe('POST handling', () => {
    it('should handle POST request with JSON body and correct response', async () => {
      const postData = JSON.stringify({ message: 'Hello from POST' });
      const nodeRequest = await extractNodeRequest(() => {
        const clientRequest = client.request({
          ':path': '/post-json',
          ':method': 'POST',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
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
        const clientRequest = client.request({
          ':path': '/post-text',
          ':method': 'POST',
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(postData),
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
