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

      const response = await angularServerApp.render(
        new Request(url, { signal: AbortSignal.timeout(30_000) }),
        undefined,
      );

      return response?.text();
    })()
      .then((content) => {
        if (typeof content !== 'string') {
          return next();
        }

        res.end(content);
      })
      .catch((error) => next(error));
  };
}
