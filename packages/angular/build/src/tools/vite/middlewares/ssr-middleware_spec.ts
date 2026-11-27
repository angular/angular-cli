/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createAngularSsrExternalMiddleware,
  createAngularSsrInternalMiddleware,
} from './ssr-middleware';

type ViteDevServer = Parameters<typeof createAngularSsrInternalMiddleware>[0];

describe('SSR dev-server middleware', () => {
  function createMockReqRes(): { req: IncomingMessage; res: ServerResponse } {
    const req = Object.assign(new EventEmitter(), {
      url: '/',
      method: 'GET',
      headers: { host: 'localhost' },
      socket: {},
    }) as unknown as IncomingMessage;

    const res = {
      statusCode: 200,
      setHeader: jasmine.createSpy('setHeader'),
      writeHead: jasmine.createSpy('writeHead'),
      end: jasmine.createSpy('end'),
    } as unknown as ServerResponse;

    return { req, res };
  }

  it('resets component updates when html:transform:pre executes in internal SSR middleware', async () => {
    let hookCallback: ((args: { html: string; url: URL }) => Promise<string>) | undefined;
    const resetComponentUpdates = jasmine.createSpy('resetComponentUpdates');
    let resolveHookRegistered!: () => void;
    const hookRegistered = new Promise<void>((resolve) => {
      resolveHookRegistered = resolve;
    });

    const fakeAngularServerApp = {
      hooks: {
        on: (_name: string, cb: typeof hookCallback) => {
          hookCallback = cb;
          resolveHookRegistered();
        },
      },
      handle: jasmine.createSpy('handle').and.resolveTo(new Response('rendered')),
    };

    const server = {
      config: { server: { allowedHosts: true }, base: '/' },
      ssrLoadModule: jasmine.createSpy('ssrLoadModule').and.resolveTo({
        ɵgetOrCreateAngularServerApp: () => fakeAngularServerApp,
      }),
      transformIndexHtml: jasmine
        .createSpy('transformIndexHtml')
        .and.callFake(async (_path: string, html: string) => html),
    } as unknown as ViteDevServer;

    const middleware = createAngularSsrInternalMiddleware(
      server,
      resetComponentUpdates,
      async (html) => html + '<!-- custom -->',
    );

    const { req, res } = createMockReqRes();
    middleware(req, res, () => {});

    await hookRegistered;

    expect(resetComponentUpdates).not.toHaveBeenCalled();
    expect(hookCallback).toBeDefined();
    const result = await hookCallback?.({
      html: '<div>test</div>',
      url: new URL('http://localhost/'),
    });
    expect(resetComponentUpdates).toHaveBeenCalledTimes(1);
    expect(result).toBe('<div>test</div><!-- custom -->');
  });

  it('aborts SSR request on client disconnect while preserving the timeout signal in internal SSR middleware', async () => {
    const timeoutController = new AbortController();
    const timeoutSpy = spyOn(AbortSignal, 'timeout').and.returnValue(timeoutController.signal);
    let capturedRequest: Request | undefined;
    let resolveHandle!: (response: Response | null) => void;
    let resolveHandleCalled!: () => void;
    const handleCalled = new Promise<void>((resolve) => {
      resolveHandleCalled = resolve;
    });

    const fakeAngularServerApp = {
      hooks: {
        on: () => {},
      },
      handle: jasmine.createSpy('handle').and.callFake((request: Request) => {
        capturedRequest = request;
        resolveHandleCalled();

        return new Promise<Response | null>((resolve) => {
          resolveHandle = resolve;
        });
      }),
    };

    const server = {
      config: { server: { allowedHosts: true }, base: '/' },
      ssrLoadModule: jasmine.createSpy('ssrLoadModule').and.resolveTo({
        ɵgetOrCreateAngularServerApp: () => fakeAngularServerApp,
      }),
      transformIndexHtml: jasmine
        .createSpy('transformIndexHtml')
        .and.callFake(async (_path: string, html: string) => html),
    } as unknown as ViteDevServer;

    const middleware = createAngularSsrInternalMiddleware(server, () => {});
    const { req, res } = createMockReqRes();
    let resolveNext!: () => void;
    const nextCalled = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });
    const next = jasmine.createSpy('next').and.callFake(() => resolveNext());

    middleware(req, res, next);
    await handleCalled;

    assert(capturedRequest);
    expect(timeoutSpy).toHaveBeenCalledOnceWith(30_000);
    expect(capturedRequest.signal.aborted).toBeFalse();

    req.emit('aborted');
    expect(capturedRequest.signal.aborted).toBeTrue();

    resolveHandle(null);
    await nextCalled;
    expect(next).toHaveBeenCalledOnceWith();
  });

  it('aborts SSR request when timeout signal fires in internal SSR middleware', async () => {
    const timeoutController = new AbortController();
    spyOn(AbortSignal, 'timeout').and.returnValue(timeoutController.signal);
    let capturedRequest: Request | undefined;
    let resolveHandle!: (response: Response | null) => void;
    let resolveHandleCalled!: () => void;
    const handleCalled = new Promise<void>((resolve) => {
      resolveHandleCalled = resolve;
    });

    const fakeAngularServerApp = {
      hooks: {
        on: () => {},
      },
      handle: jasmine.createSpy('handle').and.callFake((request: Request) => {
        capturedRequest = request;
        resolveHandleCalled();

        return new Promise<Response | null>((resolve) => {
          resolveHandle = resolve;
        });
      }),
    };

    const server = {
      config: { server: { allowedHosts: true }, base: '/' },
      ssrLoadModule: jasmine.createSpy('ssrLoadModule').and.resolveTo({
        ɵgetOrCreateAngularServerApp: () => fakeAngularServerApp,
      }),
      transformIndexHtml: jasmine
        .createSpy('transformIndexHtml')
        .and.callFake(async (_path: string, html: string) => html),
    } as unknown as ViteDevServer;

    const middleware = createAngularSsrInternalMiddleware(server, () => {});
    const { req, res } = createMockReqRes();
    let resolveNext!: () => void;
    const nextCalled = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });
    const next = jasmine.createSpy('next').and.callFake(() => resolveNext());

    middleware(req, res, next);
    await handleCalled;

    assert(capturedRequest);
    expect(capturedRequest.signal.aborted).toBeFalse();

    timeoutController.abort('timed out');
    expect(capturedRequest.signal.aborted).toBeTrue();
    expect(capturedRequest.signal.reason).toBe('timed out');

    resolveHandle(null);
    await nextCalled;
    expect(next).toHaveBeenCalledOnceWith();
  });

  it('resets component updates when html:transform:pre executes in external SSR middleware', async () => {
    let hookCallback: ((args: { html: string; url: URL }) => Promise<string>) | undefined;
    const resetComponentUpdates = jasmine.createSpy('resetComponentUpdates');
    let resolveHookRegistered!: () => void;
    const hookRegistered = new Promise<void>((resolve) => {
      resolveHookRegistered = resolve;
    });

    class FakeAngularAppEngine {
      static ɵhooks = {
        on: (_name: string, cb: typeof hookCallback) => {
          hookCallback = cb;
          resolveHookRegistered();
        },
      };
      static ɵdisableAllowedHostsCheck: boolean;
      static ɵallowStaticRouteRender: boolean;
    }

    const server = {
      config: { server: { allowedHosts: true }, base: '/' },
      ssrLoadModule: jasmine.createSpy('ssrLoadModule').and.resolveTo({
        reqHandler: Object.assign(() => new Response('ok'), { __ng_request_handler__: true }),
        AngularAppEngine: FakeAngularAppEngine,
      }),
      transformIndexHtml: jasmine
        .createSpy('transformIndexHtml')
        .and.callFake(async (_path: string, html: string) => html + '<!-- transformed -->'),
    } as unknown as ViteDevServer;

    const middleware = await createAngularSsrExternalMiddleware(server, resetComponentUpdates);

    const { req, res } = createMockReqRes();
    middleware(req, res, () => {});

    await hookRegistered;

    expect(resetComponentUpdates).not.toHaveBeenCalled();
    expect(hookCallback).toBeDefined();
    const result = await hookCallback?.({
      html: '<div>test</div>',
      url: new URL('http://localhost/'),
    });
    expect(resetComponentUpdates).toHaveBeenCalledTimes(1);
    expect(result).toBe('<div>test</div><!-- transformed -->');
  });
});
