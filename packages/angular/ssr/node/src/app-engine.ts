/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ɵAngularAppEngine as AngularAppEngine } from '@angular/ssr';
import type { IncomingMessage } from 'http';
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
   * @param request - The incoming HTTP request object to be rendered. It can be a `Request` or `IncomingMessage` object.
   * @param requestContext - Optional additional context for the request, such as metadata or custom settings.
   * @returns A promise that resolves to a `Response` object, or `null` if the request URL is for a static file
   * (e.g., `./logo.png`) rather than an application route.
   */
  render(request: Request | IncomingMessage, requestContext?: unknown): Promise<Response | null>;
}

/**
 * Angular server application engine.
 * Manages Angular server applications (including localized ones), handles rendering requests,
 * and optionally transforms index HTML before rendering.
 */
export class AngularNodeAppEngine extends AngularAppEngine implements AngularNodeServerAppManager {
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
   * @param request - The incoming HTTP request object to be rendered. It can be a `Request` or `IncomingMessage` object.
   * @param requestContext - Optional additional context for the request, such as metadata or custom settings.
   * @returns A promise that resolves to a `Response` object, or `null` if the request URL is for a static file
   * (e.g., `./logo.png`) rather than an application route.
   */
  override render(
    request: Request | IncomingMessage,
    requestContext?: unknown,
  ): Promise<Response | null> {
    const webReq = request instanceof Request ? request : createWebRequestFromNodeRequest(request);

    return super.render(webReq, requestContext);
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
}
