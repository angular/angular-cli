/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type {
  AngularAppEngine as SSRAngularAppEngine,
  ɵgetOrCreateAngularServerApp as getOrCreateAngularServerApp,
} from '@angular/ssr';
import type { ServerResponse } from 'node:http';
import type { Connect, ViteDevServer } from 'vite';
import { loadEsmModule } from '../../../utils/load-esm';
import {
  isSsrNodeRequestHandler,
  isSsrRequestHandler,
} from '../../../utils/server-rendering/utils';

export function createAngularSsrInternalMiddleware(
  server: ViteDevServer,
  indexHtmlTransformer?: (content: string) => Promise<string>,
): Connect.NextHandleFunction {
  let cachedAngularServerApp: ReturnType<typeof getOrCreateAngularServerApp> | undefined;

  return function angularSsrMiddleware(
    req: Connect.IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction,
  ) {
    if (req.url === undefined) {
      return next();
    }

    (async () => {
      // Load the compiler because `@angular/ssr/node` depends on `@angular/` packages,
      // which must be processed by the runtime linker, even if they are not used.
      await loadEsmModule('@angular/compiler');
      const { writeResponseToNodeResponse, createWebRequestFromNodeRequest } =
        await loadEsmModule<typeof import('@angular/ssr/node')>('@angular/ssr/node');

      const { ɵgetOrCreateAngularServerApp } = (await server.ssrLoadModule('/main.server.mjs')) as {
        ɵgetOrCreateAngularServerApp: typeof getOrCreateAngularServerApp;
      };

      const angularServerApp = ɵgetOrCreateAngularServerApp({
        allowStaticRouteRender: true,
      });

      // Only Add the transform hook only if it's a different instance.
      if (cachedAngularServerApp !== angularServerApp) {
        angularServerApp.hooks.on('html:transform:pre', async ({ html, url }) => {
          const processedHtml = await server.transformIndexHtml(url.pathname, html);

          return indexHtmlTransformer?.(processedHtml) ?? processedHtml;
        });

        cachedAngularServerApp = angularServerApp;
      }

      const webReq = new Request(createWebRequestFromNodeRequest(req), {
        signal: AbortSignal.timeout(30_000),
      });
      const webRes = await angularServerApp.handle(webReq);
      if (!webRes) {
        return next();
      }

      return writeResponseToNodeResponse(webRes, res);
    })().catch(next);
  };
}

export async function createAngularSsrExternalMiddleware(
  server: ViteDevServer,
  indexHtmlTransformer?: (content: string) => Promise<string>,
): Promise<Connect.NextHandleFunction> {
  let fallbackWarningShown = false;
  let cachedAngularAppEngine: typeof SSRAngularAppEngine | undefined;
  let angularSsrInternalMiddleware:
    | ReturnType<typeof createAngularSsrInternalMiddleware>
    | undefined;

  // Load the compiler because `@angular/ssr/node` depends on `@angular/` packages,
  // which must be processed by the runtime linker, even if they are not used.
  await loadEsmModule('@angular/compiler');

  const { createWebRequestFromNodeRequest, writeResponseToNodeResponse } =
    await loadEsmModule<typeof import('@angular/ssr/node')>('@angular/ssr/node');

  return function angularSsrExternalMiddleware(
    req: Connect.IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction,
  ) {
    (async () => {
      const { reqHandler, AngularAppEngine } = (await server.ssrLoadModule('./server.mjs')) as {
        reqHandler?: unknown;
        AngularAppEngine: typeof SSRAngularAppEngine;
      };

      if (!isSsrNodeRequestHandler(reqHandler) && !isSsrRequestHandler(reqHandler)) {
        if (!fallbackWarningShown) {
          // eslint-disable-next-line no-console
          console.warn(
            `The 'reqHandler' export in 'server.ts' is either undefined or does not provide a recognized request handler. ` +
              'Using the internal SSR middleware instead.',
          );

          fallbackWarningShown = true;
        }

        angularSsrInternalMiddleware ??= createAngularSsrInternalMiddleware(
          server,
          indexHtmlTransformer,
        );

        angularSsrInternalMiddleware(req, res, next);

        return;
      }

      if (cachedAngularAppEngine !== AngularAppEngine) {
        AngularAppEngine.ɵallowStaticRouteRender = true;
        AngularAppEngine.ɵhooks.on('html:transform:pre', async ({ html, url }) => {
          const processedHtml = await server.transformIndexHtml(url.pathname, html);

          return indexHtmlTransformer?.(processedHtml) ?? processedHtml;
        });

        cachedAngularAppEngine = AngularAppEngine;
      }

      // Forward the request to the middleware in server.ts
      if (isSsrNodeRequestHandler(reqHandler)) {
        await reqHandler(req, res, next);
      } else {
        const webRes = await reqHandler(createWebRequestFromNodeRequest(req));
        if (!webRes) {
          next();

          return;
        }

        await writeResponseToNodeResponse(webRes, res);
      }
    })().catch(next);
  };
}
