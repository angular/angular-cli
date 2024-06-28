/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ServerResponse } from 'node:http';
import type { Connect, ViteDevServer } from 'vite';
import { renderPage } from '../../../utils/server-rendering/render-page';
import { appendServerConfiguredHeaders, lookupMimeTypeFromRequest } from '../utils';

export function createAngularSSRMiddleware(
  server: ViteDevServer,
  outputFiles: Map<string, { contents: Uint8Array; servable: boolean }>,
  indexHtmlTransformer?: (content: string) => Promise<string>,
): Connect.NextHandleFunction {
  return function (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) {
    const url = req.originalUrl;
    if (
      !req.url ||
      // Skip if path is not defined.
      !url ||
      // Skip if path is like a file.
      // NOTE: We use a mime type lookup to mitigate against matching requests like: /browse/pl.0ef59752c0cd457dbf1391f08cbd936f
      lookupMimeTypeFromRequest(url)
    ) {
      next();

      return;
    }

    const rawHtml = outputFiles.get('/index.server.html')?.contents;
    if (!rawHtml) {
      next();

      return;
    }

    server
      .transformIndexHtml(req.url, Buffer.from(rawHtml).toString('utf-8'))
      .then(async (processedHtml) => {
        const resolvedUrls = server.resolvedUrls;
        const baseUrl = resolvedUrls?.local[0] ?? resolvedUrls?.network[0];

        if (indexHtmlTransformer) {
          processedHtml = await indexHtmlTransformer(processedHtml);
        }

        const { content: ssrContent } = await renderPage({
          document: processedHtml,
          route: new URL(req.originalUrl ?? '/', baseUrl).toString(),
          serverContext: 'ssr',
          loadBundle: (uri: string) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            server.ssrLoadModule(uri.slice(1)) as any,
          // Files here are only needed for critical CSS inlining.
          outputFiles: {},
          // TODO: add support for critical css inlining.
          inlineCriticalCss: false,
        });

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache');
        appendServerConfiguredHeaders(server, res);
        res.end(ssrContent);
      })
      .catch((error) => next(error));
  };
}
