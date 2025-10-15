/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { IncomingMessage } from 'node:http';
import { Http2ServerRequest } from 'node:http2';
import { Socket } from 'node:net';
import { createRequestUrl } from '../src/request';

// Helper to create a mock request object for testing.
function createRequest(details: {
  headers: Record<string, string | string[] | undefined>;
  encryptedSocket?: boolean;
  url?: string;
  originalUrl?: string;
}): IncomingMessage {
  return {
    headers: details.headers,
    socket: details.encryptedSocket ? ({ encrypted: true } as unknown as Socket) : new Socket(),
    url: details.url,
    originalUrl: details.originalUrl,
  } as unknown as IncomingMessage;
}

// Helper to create a mock Http2ServerRequest object for testing.
function createHttp2Request(details: {
  headers: Record<string, string | string[] | undefined>;
  url?: string;
}): Http2ServerRequest {
  return {
    headers: details.headers,
    socket: new Socket(),
    url: details.url,
  } as Http2ServerRequest;
}

describe('createRequestUrl', () => {
  it('should create a http URL with hostname and port from the host header', () => {
    const url = createRequestUrl(
      createRequest({
        headers: { host: 'localhost:8080' },
        url: '/test',
      }),
    );
    expect(url.href).toBe('http://localhost:8080/test');
  });

  it('should create a https URL when the socket is encrypted', () => {
    const url = createRequestUrl(
      createRequest({
        headers: { host: 'example.com' },
        encryptedSocket: true,
        url: '/test',
      }),
    );
    expect(url.href).toBe('https://example.com/test');
  });

  it('should use "/" as the path when the URL path is empty', () => {
    const url = createRequestUrl(
      createRequest({
        headers: { host: 'example.com' },
        encryptedSocket: true,
        url: '',
      }),
    );
    expect(url.href).toBe('https://example.com/');
  });

  it('should preserve query parameters in the URL path', () => {
    const url = createRequestUrl(
      createRequest({
        headers: { host: 'example.com' },
        encryptedSocket: true,
        url: '/test?a=1',
      }),
    );
    expect(url.href).toBe('https://example.com/test?a=1');
  });

  it('should prioritize "originalUrl" over "url" for the path', () => {
    const url = createRequestUrl(
      createRequest({
        headers: { host: 'example.com' },
        encryptedSocket: true,
        url: '/test',
        originalUrl: '/original',
      }),
    );
    expect(url.href).toBe('https://example.com/original');
  });

  it('should use "/" as the path when both "url" and "originalUrl" are not provided', () => {
    const url = createRequestUrl(
      createRequest({
        headers: { host: 'example.com' },
        encryptedSocket: true,
        url: undefined,
        originalUrl: undefined,
      }),
    );
    expect(url.href).toBe('https://example.com/');
  });

  it('should treat a protocol-relative value in "url" as part of the path', () => {
    const url = createRequestUrl(
      createRequest({
        headers: { host: 'localhost:8080' },
        url: '//example.com/test',
      }),
    );
    expect(url.href).toBe('http://localhost:8080//example.com/test');
  });

  it('should treat a protocol-relative value in "originalUrl" as part of the path', () => {
    const url = createRequestUrl(
      createRequest({
        headers: { host: 'localhost:8080' },
        url: '/test',
        originalUrl: '//example.com/original',
      }),
    );
    expect(url.href).toBe('http://localhost:8080//example.com/original');
  });

  it('should prioritize "x-forwarded-host" and "x-forwarded-proto" headers', () => {
    const url = createRequestUrl(
      createRequest({
        headers: {
          host: 'localhost:8080',
          'x-forwarded-host': 'example.com',
          'x-forwarded-proto': 'https',
        },
        url: '/test',
      }),
    );
    expect(url.href).toBe('https://example.com/test');
  });

  it('should use "x-forwarded-port" header for the port', () => {
    const url = createRequestUrl(
      createRequest({
        headers: {
          host: 'localhost:8080',
          'x-forwarded-host': 'example.com',
          'x-forwarded-proto': 'https',
          'x-forwarded-port': '8443',
        },
        url: '/test',
      }),
    );
    expect(url.href).toBe('https://example.com:8443/test');
  });
});
