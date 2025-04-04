/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { AngularAppEngine } from '@angular/ssr';
import type { IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';
import { attachNodeGlobalErrorHandlers } from './errors';
import { createWebRequestFromNodeRequest } from './request';

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones), handles rendering requests,
 * and optionally transforms index HTML before rendering.
 *
 * @remarks This class should be instantiated once and used as a singleton across the server-side
 * application to ensure consistent handling of rendering requests and resource management.
 */
export class AngularNodeAppEngine {
  private readonly angularAppEngine = new AngularAppEngine();

  constructor() {
    attachNodeGlobalErrorHandlers();
  }

  /**
   * Handles an incoming HTTP request by serving prerendered content, performing server-side rendering,
   * or delivering a static file for client-side rendered routes based on the `RenderMode` setting.
   *
   * This method adapts Node.js's `IncomingMessage` or `Http2ServerRequest`
   * to a format compatible with the `AngularAppEngine` and delegates the handling logic to it.
   *
   * @param request - The incoming HTTP request (`IncomingMessage` or `Http2ServerRequest`).
   * @param requestContext - Optional context for rendering, such as metadata associated with the request.
   * @returns A promise that resolves to the resulting HTTP response object, or `null` if no matching Angular route is found.
   *
   * @remarks A request to `https://www.example.com/page/index.html` will serve or render the Angular route
   * corresponding to `https://www.example.com/page`.
   */
  async handle(
    request: IncomingMessage | Http2ServerRequest,
    requestContext?: unknown,
  ): Promise<Response | null> {
    const webRequest = createWebRequestFromNodeRequest(request);

    return this.angularAppEngine.handle(webRequest, requestContext);
  }
}
