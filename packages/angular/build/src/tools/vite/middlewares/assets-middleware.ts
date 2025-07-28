/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lookup as lookupMimeType } from 'mrmime';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { extname } from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import { AngularMemoryOutputFiles, AngularOutputAssets, pathnameWithoutBasePath } from '../utils';

export interface ComponentStyleRecord {
  rawContent: Uint8Array;
  used?: Set<string>;
  reload?: boolean;
}

const CSS_PREPROCESSOR_REGEXP = /\.(?:s[ac]ss|less|css)$/;
const JS_TS_REGEXP = /\.[cm]?[tj]sx?$/;

export function createAngularAssetsMiddleware(
  server: ViteDevServer,
  assets: AngularOutputAssets,
  outputFiles: AngularMemoryOutputFiles,
  componentStyles: Map<string, ComponentStyleRecord>,
  encapsulateStyle: (style: Uint8Array, componentId: string) => string,
): Connect.NextHandleFunction {
  return function angularAssetsMiddleware(req, res, next) {
    if (req.url === undefined || res.writableEnded) {
      return;
    }

    // Parse the incoming request.
    // The base of the URL is unused but required to parse the URL.
    const pathname = pathnameWithoutBasePath(req.url, server.config.base);
    const extension = extname(pathname);
    const pathnameHasTrailingSlash = pathname[pathname.length - 1] === '/';

    // Rewrite all build assets to a vite raw fs URL
    const asset = assets.get(pathname);
    if (asset) {
      // This is a workaround to serve CSS, JS and TS files without Vite transformations.
      if (JS_TS_REGEXP.test(extension) || CSS_PREPROCESSOR_REGEXP.test(extension)) {
        const contents = readFileSync(asset.source);
        const etag = `W/${createHash('sha256').update(contents).digest('hex')}`;
        if (checkAndHandleEtag(req, res, etag)) {
          return;
        }

        const mimeType = lookupMimeType(extension);
        if (mimeType) {
          res.setHeader('Content-Type', mimeType);
        }

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'no-cache');
        res.end(contents);
      } else {
        // The encoding needs to match what happens in the vite static middleware.
        // ref: https://github.com/vitejs/vite/blob/d4f13bd81468961c8c926438e815ab6b1c82735e/packages/vite/src/node/server/middlewares/static.ts#L163
        req.url = `${server.config.base}@fs/${encodeURI(asset.source)}`;
        next();
      }

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
      req.url = `${server.config.base}@fs/${encodeURI(htmlAssetSourcePath.source)}`;
      next();

      return;
    }

    // Support HTTP HEAD requests for the virtual output files from the Angular build
    if (req.method === 'HEAD' && outputFiles.get(pathname)?.servable) {
      // While a GET will also generate content, the rest of the response is equivalent
      req.method = 'GET';
    }

    // Resource files are handled directly.
    // Global stylesheets (CSS files) are currently considered resources to workaround
    // dev server sourcemap issues with stylesheets.
    if (extension !== '.js' && extension !== '.html') {
      const outputFile = outputFiles.get(pathname);
      if (outputFile?.servable) {
        let data: Uint8Array | string = outputFile.contents;
        const componentStyle = componentStyles.get(pathname);
        if (componentStyle) {
          // Inject component ID for view encapsulation if requested
          const searchParams = new URL(req.url, 'http://localhost').searchParams;
          const componentId = searchParams.get('ngcomp');
          if (componentId !== null) {
            // Track if the component uses ShadowDOM encapsulation (3 = ViewEncapsulation.ShadowDom)
            // Shadow DOM components currently require a full reload.
            // Vite's CSS hot replacement does not support shadow root searching.
            if (searchParams.get('e') === '3') {
              componentStyle.reload = true;
            }

            // Record the component style usage for HMR updates
            if (componentStyle.used === undefined) {
              componentStyle.used = new Set([componentId]);
            } else {
              componentStyle.used.add(componentId);
            }

            const etag = `W/"${outputFile.contents.byteLength}-${outputFile.hash}-${componentId}"`;
            if (checkAndHandleEtag(req, res, etag)) {
              return;
            }

            // Shim the stylesheet if a component ID is provided
            if (componentId.length > 0) {
              // Validate component ID
              if (!/^[_.\-\p{Letter}\d]+-c\d+$/u.test(componentId)) {
                const message = 'Invalid component stylesheet ID request: ' + componentId;
                // eslint-disable-next-line no-console
                console.error(message);
                res.statusCode = 400;
                res.end(message);

                return;
              }

              data = encapsulateStyle(data, componentId);
            }

            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('ETag', etag);
            res.end(data);

            return;
          }
        }

        const etag = `W/"${outputFile.contents.byteLength}-${outputFile.hash}"`;
        if (checkAndHandleEtag(req, res, etag)) {
          return;
        }

        const mimeType = lookupMimeType(extension);
        if (mimeType) {
          res.setHeader('Content-Type', mimeType);
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('ETag', etag);
        res.end(data);

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

function checkAndHandleEtag(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  etag: string,
): boolean {
  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304;
    res.end();

    return true;
  }

  return false;
}
