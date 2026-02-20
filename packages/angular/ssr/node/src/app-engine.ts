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
import { AngularAppEngineOptions } from '../../src/app-engine';
import { getAllowedHostsFromEnv } from './environment-options';
import { attachNodeGlobalErrorHandlers } from './errors';
import { createWebRequestFromNodeRequest } from './request';

/**
 * Options for the Angular Node.js server application engine.
 */
export interface AngularNodeAppEngineOptions extends AngularAppEngineOptions {}

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones), handles rendering requests,
 * and optionally transforms index HTML before rendering.
 *
 * @remarks This class should be instantiated once and used as a singleton across the server-side
 * application to ensure consistent handling of rendering requests and resource management.
 */
export class AngularNodeAppEngine {
  private readonly angularAppEngine: AngularAppEngine;

  /**
   * Creates a new instance of the Angular Node.js server application engine.
   * @param options Options for the Angular Node.js server application engine.
   */
  constructor(options?: AngularNodeAppEngineOptions) {
    this.angularAppEngine = new AngularAppEngine({
      ...options,
      allowedHosts: [...getAllowedHostsFromEnv(), ...(options?.allowedHosts ?? [])],
    });

    attachNodeGlobalErrorHandlers();
  }

  /**
   * Handles an incoming HTTP request by serving prerendered content, performing server-side rendering,
   * or delivering a static file for client-side rendered routes based on the `RenderMode` setting.
   *
   * This method adapts Node.js's `IncomingMessage`, `Http2ServerRequest` or `Request`
   * to a format compatible with the `AngularAppEngine` and delegates the handling logic to it.
   *
   * @param request - The incoming HTTP request (`IncomingMessage`, `Http2ServerRequest` or `Request`).
   * @param requestContext - Optional context for rendering, such as metadata associated with the request.
   * @returns A promise that resolves to the resulting HTTP response object, or `null` if no matching Angular route is found.
   *
   * @remarks A request to `https://www.example.com/page/index.html` will serve or render the Angular route
   * corresponding to `https://www.example.com/page`.
   *
   * @remarks
   * To prevent potential Server-Side Request Forgery (SSRF), this function verifies the hostname
   * of the `request.url` against a list of authorized hosts.
   * If the hostname is not recognized and `allowedHosts` is not empty, a Client-Side Rendered (CSR) version of the
   * page is returned otherwise a 400 Bad Request is returned.
   *
   * Resolution:
   * Authorize your hostname by configuring `allowedHosts` in `angular.json` in:
   * `projects.[project-name].architect.build.options.security.allowedHosts`.
   * Alternatively, you can define the allowed hostname via the environment variable `process.env['NG_ALLOWED_HOSTS']`
   * or pass it directly through the configuration options of `AngularNodeAppEngine`.
   *
   * For more information see: https://angular.dev/best-practices/security#preventing-server-side-request-forgery-ssrf
   */
  async handle(
    request: IncomingMessage | Http2ServerRequest | Request,
    requestContext?: unknown,
  ): Promise<Response | null> {
    const webRequest =
      request instanceof Request ? request : createWebRequestFromNodeRequest(request);

    return this.angularAppEngine.handle(webRequest, requestContext);
  }
}
