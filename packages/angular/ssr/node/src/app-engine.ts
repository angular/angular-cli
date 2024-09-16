/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { AngularAppEngine } from '@angular/ssr';
import type { IncomingMessage } from 'node:http';
import { createWebRequestFromNodeRequest } from './request';

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones), handles rendering requests,
 * and optionally transforms index HTML before rendering.
 *
 * @note This class should be instantiated once and used as a singleton across the server-side
 * application to ensure consistent handling of rendering requests and resource management.
 *
 * @developerPreview
 */
export class AngularNodeAppEngine {
  private readonly angularAppEngine = new AngularAppEngine();

  /**
   * Renders an HTTP response based on the incoming request using the Angular server application.
   *
   * The method processes the incoming request, determines the appropriate route, and prepares the
   * rendering context to generate a response. If the request URL corresponds to a static file (excluding `/index.html`),
   * the method returns `null`.
   *
   * Example: A request to `https://www.example.com/page/index.html` will render the Angular route
   * associated with `https://www.example.com/page`.
   *
   * @param request - The incoming HTTP request object to be rendered.
   * @param requestContext - Optional additional context for the request, such as metadata or custom settings.
   * @returns A promise that resolves to a `Response` object, or `null` if the request URL is for a static file
   * (e.g., `./logo.png`) rather than an application route.
   */
  render(request: IncomingMessage, requestContext?: unknown): Promise<Response | null> {
    return this.angularAppEngine.render(createWebRequestFromNodeRequest(request), requestContext);
  }

  /**
   * Retrieves HTTP headers for a request associated with statically generated (SSG) pages,
   * based on the URL pathname.
   *
   * @param request - The incoming request object.
   * @returns A `Map` containing the HTTP headers as key-value pairs.
   * @note This function should be used exclusively for retrieving headers of SSG pages.
   * @example
   * ```typescript
   * const angularAppEngine = new AngularNodeAppEngine();
   *
   * app.use(express.static('dist/browser', {
   *   setHeaders: (res, path) => {
   *     // Retrieve headers for the current request
   *     const headers = angularAppEngine.getPrerenderHeaders(res.req);
   *
   *     // Apply the retrieved headers to the response
   *     for (const [key, value] of headers) {
   *       res.setHeader(key, value);
   *     }
   *   }
     }));
  * ```
  */
  getPrerenderHeaders(request: IncomingMessage): ReadonlyMap<string, string> {
    return this.angularAppEngine.getPrerenderHeaders(createWebRequestFromNodeRequest(request));
  }
}
