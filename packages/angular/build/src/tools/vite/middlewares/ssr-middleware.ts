/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ɵgetOrCreateAngularServerApp as getOrCreateAngularServerApp } from '@angular/ssr';
import type { ServerResponse } from 'node:http';
import type { Connect, ViteDevServer } from 'vite';
import { loadEsmModule } from '../../../utils/load-esm';

export function createAngularSSRMiddleware(
  server: ViteDevServer,
  indexHtmlTransformer?: (content: string) => Promise<string>,
): Connect.NextHandleFunction {
  let cachedAngularServerApp: ReturnType<typeof getOrCreateAngularServerApp> | undefined;

  return function angularSSRMiddleware(
    req: Connect.IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction,
  ) {
    if (req.url === undefined) {
      return next();
    }

    const resolvedUrls = server.resolvedUrls;
    const baseUrl = resolvedUrls?.local[0] ?? resolvedUrls?.network[0];
    const url = new URL(req.url, baseUrl);

    (async () => {
      const { writeResponseToNodeResponse, createWebRequestFromNodeRequest } =
        await loadEsmModule<typeof import('@angular/ssr/node')>('@angular/ssr/node');

      const { ɵgetOrCreateAngularServerApp } = (await server.ssrLoadModule('/main.server.mjs')) as {
        ɵgetOrCreateAngularServerApp: typeof getOrCreateAngularServerApp;
      };

      const angularServerApp = ɵgetOrCreateAngularServerApp();
      // Only Add the transform hook only if it's a different instance.
      if (cachedAngularServerApp !== angularServerApp) {
        angularServerApp.hooks.on('html:transform:pre', async ({ html }) => {
          const processedHtml = await server.transformIndexHtml(url.pathname, html);

          return indexHtmlTransformer?.(processedHtml) ?? processedHtml;
        });

        cachedAngularServerApp = angularServerApp;
      }

      const webReq = new Request(createWebRequestFromNodeRequest(req), {
        signal: AbortSignal.timeout(30_000),
      });
      const webRes = await angularServerApp.render(webReq);
      if (!webRes) {
        return next();
      }

      return writeResponseToNodeResponse(webRes, res);
    })().catch(next);
  };
}
