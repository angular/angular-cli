/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';
import { addLeadingSlash } from '../../../utils/url';

/**
 * Patches the Vite base middleware to correctly handle the Angular application's base href.
 * This is necessary because Vite's default base middleware might not align with Angular's
 * expected path handling when using SSR, especially when a base href is configured.
 *
 * @param middlewares The Connect server instance containing the middleware stack.
 * @param base The base URL path to be handled by the middleware.
 */
export function patchBaseMiddleware(middlewares: Connect.Server, base: string): void {
  const entry = middlewares.stack.find(
    ({ handle }) => typeof handle === 'function' && handle.name.startsWith('viteBaseMiddleware'),
  );

  if (typeof entry?.handle !== 'function') {
    return;
  }

  entry.handle = function angularBaseMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) {
    const url = req.url || '/';
    if (url.startsWith(base)) {
      // Rewrite the URL to remove the base prefix before passing it to the next middleware.
      // If the URL is exactly the base, it becomes '/'.
      // Otherwise, we slice off the base and ensure there's a leading slash.
      // See: https://github.com/vitejs/vite/blob/e81c183f8c8ccaf7774ef0d0ee125bf63dbf30b4/packages/vite/src/node/server/middlewares/base.ts#L12
      req.url = url === base ? '/' : addLeadingSlash(url.slice(base.length - 1));

      return next();
    }

    const { pathname, hash, search } = new URL(url, 'http://localhost');
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(302, { Location: `${base}${search}${hash}` });
      res.end();

      return;
    }

    next();
  };
}
