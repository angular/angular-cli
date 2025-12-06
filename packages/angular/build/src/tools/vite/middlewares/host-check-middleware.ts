/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ServerResponse } from 'node:http';
import type { Connect, ViteDevServer } from 'vite';

function extractHostname(hostHeader: string | undefined): string | undefined {
  if (!hostHeader) {
    return undefined;
  }

  // Remove port if present (e.g., example.com:4200)
  const idx = hostHeader.lastIndexOf(':');
  if (idx > -1 && hostHeader.indexOf(']') === -1) {
    // Skip IPv6 addresses that include ':' within brackets
    return hostHeader.slice(0, idx).toLowerCase();
  }

  return hostHeader.toLowerCase();
}

function isLocalHost(name: string | undefined): boolean {
  if (!name) return false;
  return name === 'localhost' || name === '127.0.0.1' || name === '[::1]' || name === '::1';
}

function html403(hostname: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blocked request</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;line-height:1.4;margin:2rem;color:#1f2937}
      code{background:#f3f4f6;padding:.15rem .35rem;border-radius:.25rem}
      .box{max-width:760px;margin:0 auto}
      h1{font-size:1.5rem;margin-bottom:.75rem}
      p{margin:.5rem 0}
      .muted{color:#6b7280}
      pre{background:#f9fafb;border:1px solid #e5e7eb;padding:.75rem;border-radius:.5rem;overflow:auto}
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Blocked request. This host ("${hostname}") is not allowed.</h1>
      <p>The Angular development server only responds to local hosts by default.</p>
      <p>To allow this host, add it to <code>allowedHosts</code> under the <code>serve</code> target in <code>angular.json</code>.</p>
      <pre><code>{
  "serve": {
    "options": {
      "allowedHosts": ["${hostname}"]
    }
  }
}</code></pre>
    </div>
  </body>
  </html>`;
}

/**
 * Middleware that enforces host checking using Angular CLI's `allowedHosts` option.
 *
 * Vite's own host check is disabled in the server configuration so that we can
 * present an Angular-specific guidance page when blocked.
 */
export function createAngularHostCheckMiddleware(
  _server: ViteDevServer,
  allowedHosts: true | string[] | undefined,
  devHost: string,
): Connect.NextHandleFunction {
  // Normalize configured allowed hosts
  const allowAll = allowedHosts === true;
  const allowedSet = new Set(
    Array.isArray(allowedHosts) ? allowedHosts.map((h) => h.toLowerCase()) : [],
  );

  const devHostLower = devHost?.toLowerCase?.();

  return function angularHostCheckMiddleware(
    req: Connect.IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction,
  ) {
    if (allowAll) {
      return next();
    }

    const hostname = extractHostname(req.headers.host);

    // Always allow local access and the explicit dev host when meaningful
    if (
      isLocalHost(hostname) ||
      (devHostLower && devHostLower !== '0.0.0.0' && hostname === devHostLower)
    ) {
      return next();
    }

    // Allow if present in configured list
    if (hostname && allowedSet.has(hostname)) {
      return next();
    }

    // Block with an Angular-specific 403 page
    const body = html403(hostname ?? '');
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(body));
    res.end(body);
  };
}
