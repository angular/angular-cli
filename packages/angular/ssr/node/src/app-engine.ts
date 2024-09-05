/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { destroyAngularAppEngine, getOrCreateAngularAppEngine } from '@angular/ssr';
import type { IncomingMessage } from 'node:http';
import { createWebRequestFromNodeRequest } from './request';

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones) and handles rendering requests.

 * @developerPreview
 */
export interface AngularNodeServerAppManager {
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
  render(request: IncomingMessage, requestContext?: unknown): Promise<Response | null>;

  /**
   * Retrieves HTTP headers for a request associated with statically generated (SSG) pages,
   * based on the URL pathname.
   *
   * @param request - The incoming request object.
   * @returns A `Map` containing the HTTP headers as key-value pairs.
   * @note This function should be used exclusively for retrieving headers of SSG pages.
   * @example
   * ```typescript
   * const angularAppEngine = getOrCreateAngularNodeAppEngine();
   *
   * app.use(express.static('dist/browser', {
   *   setHeaders: (res, path) => {
   *     // Retrieve headers for the current request
   *     const headers = angularAppEngine.getHeaders(res.req);
   *
   *     // Apply the retrieved headers to the response
   *     for (const { key, value } of headers) {
   *       res.setHeader(key, value);
   *     }
   *   }
     }));
  * ```
  */
  getHeaders(request: IncomingMessage): Readonly<Map<string, string>>;
}

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones), handles rendering requests,
 * and optionally transforms index HTML before rendering.
 */
class AngularNodeAppEngine implements AngularNodeServerAppManager {
  private readonly angularAppEngine = getOrCreateAngularAppEngine();

  render(request: IncomingMessage, requestContext?: unknown): Promise<Response | null> {
    return this.angularAppEngine.render(createWebRequestFromNodeRequest(request), requestContext);
  }

  getHeaders(request: IncomingMessage): Readonly<Map<string, string>> {
    return this.angularAppEngine.getHeaders(createWebRequestFromNodeRequest(request));
  }
}

let angularNodeAppEngine: AngularNodeAppEngine | undefined;

/**
 * Retrieves the existing `AngularNodeAppEngine` instance or creates a new one if it doesn't exist.
 *
 * This method ensures that a single instance of `AngularNodeAppEngine` is used throughout the application's lifecycle,
 * promoting efficient resource management. If an instance does not exist, it will be instantiated upon the first call.
 *
 * @developerPreview
 * @returns The existing or newly created instance of `AngularNodeAppEngine`.
 */
export function getOrCreateAngularNodeAppEngine(): AngularNodeServerAppManager {
  return (angularNodeAppEngine ??= new AngularNodeAppEngine());
}

/**
 * Destroys the current `AngularNodeAppEngine` instance and releases any associated resources.
 *
 * This method resets the reference to the `AngularNodeAppEngine` instance to `undefined`, allowing for the creation
 * of a new instance on subsequent calls to `getOrCreateAngularNodeAppEngine()`. This is typically used when
 * reinitializing the server environment or refreshing the application state.
 *
 * @developerPreview
 */
export function destroyAngularNodeAppEngine(): void {
  angularNodeAppEngine = undefined;
  destroyAngularAppEngine();
}
