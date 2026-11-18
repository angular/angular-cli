/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { ManualRebuildController } from '../../../utils/manual-rebuild';
import { createAngularRebuildMiddleware } from './rebuild-middleware';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string | undefined;
  ended: Promise<void>;
}

function createRequest(
  url: string,
  method: string,
  headers: Record<string, string> = {},
): IncomingMessage {
  return { url, method, headers } as unknown as IncomingMessage;
}

function createResponse(): [ServerResponse, MockResponse] {
  let resolveEnded: () => void;
  const mock: MockResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: new Promise((resolve) => (resolveEnded = resolve)),
  };
  const res = {
    set statusCode(value: number) {
      mock.statusCode = value;
    },
    setHeader(name: string, value: string) {
      mock.headers[name.toLowerCase()] = value;
    },
    end(body?: string) {
      mock.body = body;
      resolveEnded();
    },
  };

  return [res as unknown as ServerResponse, mock];
}

describe('createAngularRebuildMiddleware', () => {
  let controller: ManualRebuildController;
  let middleware: ReturnType<typeof createAngularRebuildMiddleware>;

  beforeEach(() => {
    controller = new ManualRebuildController();
    spyOn(controller, 'requestRebuild').and.resolveTo({ status: 'success' });
    middleware = createAngularRebuildMiddleware(controller);
  });

  it('passes through requests for other routes', () => {
    const next = jasmine.createSpy('next');
    const [res] = createResponse();
    middleware(createRequest('/main.js', 'POST'), res, next);

    expect(next).toHaveBeenCalled();
    expect(controller.requestRebuild).not.toHaveBeenCalled();
  });

  it('requests a rebuild and responds with the result', async () => {
    const [res, mock] = createResponse();
    middleware(createRequest('/__ng_rebuild?x=1', 'POST'), res, jasmine.createSpy('next'));
    await mock.ended;

    expect(mock.statusCode).toBe(200);
    expect(mock.headers['content-type']).toBe('application/json');
    expect(JSON.parse(mock.body ?? '')).toEqual({ status: 'success' });
  });

  it('responds with 405 for non-POST requests', async () => {
    const [res, mock] = createResponse();
    middleware(createRequest('/__ng_rebuild', 'GET'), res, jasmine.createSpy('next'));
    await mock.ended;

    expect(mock.statusCode).toBe(405);
    expect(controller.requestRebuild).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests', async () => {
    const [res, mock] = createResponse();
    middleware(
      createRequest('/__ng_rebuild', 'POST', {
        host: 'localhost:4200',
        origin: 'http://example.com',
      }),
      res,
      jasmine.createSpy('next'),
    );
    await mock.ended;

    expect(mock.statusCode).toBe(403);
    expect(controller.requestRebuild).not.toHaveBeenCalled();
  });

  it('accepts same-origin requests', async () => {
    const [res, mock] = createResponse();
    middleware(
      createRequest('/__ng_rebuild', 'POST', {
        host: 'localhost:4200',
        origin: 'http://localhost:4200',
      }),
      res,
      jasmine.createSpy('next'),
    );
    await mock.ended;

    expect(mock.statusCode).toBe(200);
  });

  it('accepts same-origin HTTP/2 requests using the ":authority" header', async () => {
    const [res, mock] = createResponse();
    middleware(
      createRequest('/__ng_rebuild', 'POST', {
        ':authority': 'localhost:4200',
        origin: 'https://localhost:4200',
      }),
      res,
      jasmine.createSpy('next'),
    );
    await mock.ended;

    expect(mock.statusCode).toBe(200);
  });
});
