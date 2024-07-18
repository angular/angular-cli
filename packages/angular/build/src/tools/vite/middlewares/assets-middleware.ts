/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lookup as lookupMimeType } from 'mrmime';
import { extname } from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import {
  AngularMemoryOutputFiles,
  appendServerConfiguredHeaders,
  pathnameWithoutBasePath,
} from '../utils';

export function createAngularAssetsMiddleware(
  server: ViteDevServer,
  assets: Map<string, string>,
  outputFiles: AngularMemoryOutputFiles,
): Connect.NextHandleFunction {
  return function (req, res, next) {
    if (req.url === undefined || res.writableEnded) {
      return;
    }

    // Parse the incoming request.
    // The base of the URL is unused but required to parse the URL.
    const pathname = pathnameWithoutBasePath(req.url, server.config.base);
    const extension = extname(pathname);
    const pathnameHasTrailingSlash = pathname[pathname.length - 1] === '/';

    // Rewrite all build assets to a vite raw fs URL
    const assetSourcePath = assets.get(pathname);
    if (assetSourcePath !== undefined) {
      // Workaround to disable Vite transformer middleware.
      // See: https://github.com/vitejs/vite/blob/746a1daab0395f98f0afbdee8f364cb6cf2f3b3f/packages/vite/src/node/server/middlewares/transform.ts#L201 and
      // https://github.com/vitejs/vite/blob/746a1daab0395f98f0afbdee8f364cb6cf2f3b3f/packages/vite/src/node/server/transformRequest.ts#L204-L206
      req.headers.accept = 'text/html';

      // The encoding needs to match what happens in the vite static middleware.
      // ref: https://github.com/vitejs/vite/blob/d4f13bd81468961c8c926438e815ab6b1c82735e/packages/vite/src/node/server/middlewares/static.ts#L163
      req.url = `${server.config.base}@fs/${encodeURI(assetSourcePath)}`;
      next();

      return;
    }

    // HTML fallbacking
    // This matches what happens in the vite html fallback middleware.
    // ref: https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/middlewares/htmlFallback.ts#L9
    const htmlAssetSourcePath = pathnameHasTrailingSlash
      ? // Trailing slash check for `index.html`.
        assets.get(pathname + 'index.html')
      : // Non-trailing slash check for fallback `.html`
        assets.get(pathname + '.html');

    if (htmlAssetSourcePath) {
      req.url = `${server.config.base}@fs/${encodeURI(htmlAssetSourcePath)}`;
      next();

      return;
    }

    // Resource files are handled directly.
    // Global stylesheets (CSS files) are currently considered resources to workaround
    // dev server sourcemap issues with stylesheets.
    if (extension !== '.js' && extension !== '.html') {
      const outputFile = outputFiles.get(pathname);
      if (outputFile?.servable) {
        const mimeType = lookupMimeType(extension);
        if (mimeType) {
          res.setHeader('Content-Type', mimeType);
        }
        res.setHeader('Cache-Control', 'no-cache');
        appendServerConfiguredHeaders(server, res);
        res.end(outputFile.contents);

        return;
      }
    }

    // If the path has no trailing slash and it matches a servable directory redirect to the same path with slash.
    // This matches the default express static behaviour.
    // See: https://github.com/expressjs/serve-static/blob/89fc94567fae632718a2157206c52654680e9d01/index.js#L182
    if (!pathnameHasTrailingSlash) {
      for (const assetPath of assets.keys()) {
        if (pathname === assetPath.substring(0, assetPath.lastIndexOf('/'))) {
          const { pathname, search, hash } = new URL(req.url, 'http://localhost');
          const location = [pathname, '/', search, hash].join('');

          res.statusCode = 301;
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Location', location);
          res.end(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <title>Redirecting</title>
              </head>
              <body>
                <pre>Redirecting to <a href="${location}">${location}</a></pre>
              </body>
            </html>
            `);

          return;
        }
      }
    }

    next();
  };
}
