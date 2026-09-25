/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createAngularSsrExternalMiddleware,
  createAngularSsrInternalMiddleware,
} from './ssr-middleware';

type ViteDevServer = Parameters<typeof createAngularSsrInternalMiddleware>[0];

describe('SSR dev-server middleware', () => {
  function createMockReqRes(): { req: IncomingMessage; res: ServerResponse } {
    const req = {
      url: '/',
      method: 'GET',
      headers: { host: 'localhost' },
    } as unknown as IncomingMessage;

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
